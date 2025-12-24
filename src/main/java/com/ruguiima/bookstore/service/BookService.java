package com.ruguiima.bookstore.service;

import com.ruguiima.bookstore.model.entity.Book;
import com.ruguiima.bookstore.model.dto.BookCreateRequest;
import com.ruguiima.bookstore.mapper.BookMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookService {
    private final BookMapper mapper;

    // 封面源文件保存目录（源码资源）
    private Path imageDir() {
        return Path.of(System.getProperty("user.dir"), "src", "main", "resources", "static", "image");
    }
    // 运行时静态资源目录（Spring Boot 实际加载）
    private Path runtimeImageDir() {
        return Path.of(System.getProperty("user.dir"), "target", "classes", "static", "image");
    }

    // 读取全部图书（兼容旧命名 readAll）
    public List<Book> readAll() {
        return mapper.findAll();
    }
    public Book findById(Long id) {
        if (id == null) return null;
        return mapper.findById(id.intValue());
    }
    // 使用 DTO 精简参数
    public synchronized Book createBook(BookCreateRequest req, MultipartFile coverFile) {
        String title = req.getTitle();
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("标题不能为空");
        }
        Double price = parseDouble(req.getPrice());
        Double originalPrice = parseDouble(req.getOriginalPrice());
        Double rating = normalizeRating(parseDouble(req.getRating()));
        List<String> keywords = parseKeywords(req.getKeywords());

        // 先构建 Book（ID 由数据库生成）
        Book created = Book.builder()
                .title(title.trim())
                .author(req.getAuthor())
                .category(req.getCategory())
                .price(price)
                .originalPrice(originalPrice)
                .rating(rating)
                .description(req.getDesc())
                .keywords(keywords)
                .build();

        // 预先保存封面文件需要 ID，故先插入获取 ID，再更新封面字段
        mapper.insert(created);
        String coverPath = saveCoverIfPresent(created.getId(), coverFile);
        if (coverPath != null) {
            mapper.updateCover(created.getId(), coverPath);
            created.setCover(coverPath);
        }
        return created;
    }

    // 更新图书信息
    public synchronized Book updateBook(Long id, BookCreateRequest req, MultipartFile coverFile) {
        if (id == null) return null;

        // 检查图书是否存在
        Book existing = mapper.findById(id.intValue());
        if (existing == null) return null;

        String title = req.getTitle();
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("标题不能为空");
        }
        Double price = parseDouble(req.getPrice());
        Double originalPrice = parseDouble(req.getOriginalPrice());
        Double rating = normalizeRating(parseDouble(req.getRating()));
        List<String> keywords = parseKeywords(req.getKeywords());

        // 处理封面逻辑
        String coverPath = existing.getCover(); // 默认保持原有封面

        // 如果上传了新封面，保存并更新封面路径
        String newCoverPath = saveCoverIfPresent(id.intValue(), coverFile);
        if (newCoverPath != null) {
            coverPath = newCoverPath; // 使用新封面
        }

        // 构建更新的图书对象
        Book updated = Book.builder()
                .id(id.intValue())
                .title(title.trim())
                .author(req.getAuthor())
                .category(req.getCategory())
                .price(price)
                .originalPrice(originalPrice)
                .rating(rating)
                .description(req.getDesc())
                .keywords(keywords)
                .cover(coverPath) // 使用处理后的封面路径
                .build();


        mapper.update(updated);
        return updated;
    }

    // 删除图书
    public synchronized boolean deleteBook(Long id) {
        if (id == null) return false;

        Book existing = mapper.findById(id.intValue());
        if (existing == null) return false;

        // 删除图书记录
        mapper.deleteById(id.intValue());

        // 可以选择删除对应的封面文件，这里先保留文件
        // TODO: 如果需要删除文件，可以在这里添加文件删除逻辑

        return true;
    }

    // 保存封面：写入源码与运行时目录，返回可访问路径；失败返回 null
    private String saveCoverIfPresent(int id, MultipartFile coverFile) {
        if (coverFile == null || coverFile.isEmpty()) return null;
        try {
            Files.createDirectories(imageDir());
            Files.createDirectories(runtimeImageDir());

            // 安全处理文件名，避免NullPointerException
            String originalFilename = coverFile.getOriginalFilename();
            if (originalFilename == null || originalFilename.trim().isEmpty()) {
                originalFilename = "cover.jpg"; // 提供默认文件名
            }

            String ext = extName(originalFilename);
            String fileName = "book_" + id + "_" + Instant.now().toEpochMilli() + ext;
            Path targetSrc = imageDir().resolve(fileName);
            Path targetRuntime = runtimeImageDir().resolve(fileName);
            try (InputStream in = coverFile.getInputStream()) {
                Files.copy(in, targetSrc, StandardCopyOption.REPLACE_EXISTING);
            }
            try (InputStream in2 = Files.newInputStream(targetSrc, StandardOpenOption.READ)) {
                Files.copy(in2, targetRuntime, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/image/" + fileName;
        } catch (Exception ex) {
            System.err.println("保存封面失败: " + ex.getMessage());
            return null;
        }
    }

    // 解析数字，可空
    private Double parseDouble(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Double.parseDouble(s.trim());
        } catch (Exception e) {
            return null;
        }
    }

    // 规范评分范围 0-5
    private Double normalizeRating(Double r) {
        if (r == null) return null;
        if (r < 0) return 0.0;
        if (r > 5) return 5.0;
        return r;
    }

    // 解析关键词，分隔符支持：逗号/中文逗号/分号/空白/换行
    private List<String> parseKeywords(String raw) {
        if (raw == null) return Collections.emptyList();
        return Arrays.stream(raw.split("[，,;\n\r\t ]+"))
                .map(String::trim)
                .filter(v -> !v.isEmpty())
                .limit(30)
                .toList();
    }

    // 提取文件扩展名并限制白名单
    private String extName(String filename) {
        int idx = filename.lastIndexOf('.');
        if (idx < 0) return "";
        String ext = filename.substring(idx).toLowerCase(Locale.ROOT);
        if (ext.matches("\\.(png|jpg|jpeg|gif|webp|bmp)")) return ext;
        return ".dat"; // 不安全类型统一使用 .dat
    }
}
