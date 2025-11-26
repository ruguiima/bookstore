package com.ruguiima.bookstore.service;

import com.ruguiima.bookstore.model.entity.Book;
import com.ruguiima.bookstore.model.dto.BookCreateRequest;
import com.ruguiima.bookstore.repository.BookRepository;
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
    private final BookRepository repository;

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
        return repository.findAll();
    }

    // 使用 DTO 精简参数
    public synchronized Book createBook(BookCreateRequest req, MultipartFile coverFile) {
        String title = req.getTitle();
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("标题不能为空");
        }
        List<Book> all = repository.findAll();
        int nextId = all.stream().map(Book::getId)
                                 .filter(Objects::nonNull)
                                 .mapToInt(Integer::intValue)
                                 .max().orElse(0) + 1;

        Double price = parseDouble(req.getPrice());
        Double originalPrice = parseDouble(req.getOriginalPrice());
        Double rating = normalizeRating(parseDouble(req.getRating()));
        List<String> keywords = parseKeywords(req.getKeywords());
        String coverPath = saveCoverIfPresent(nextId, coverFile);

        Book created = new Book(nextId, title.trim(), req.getAuthor(),
                                req.getCategory(), price, originalPrice,
                                rating, req.getDesc(), keywords, coverPath);
        return repository.save(created);
    }

    // 保存封面：写入源码与运行时目录，返回可访问路径；失败返回 null
    private String saveCoverIfPresent(int id, MultipartFile coverFile) {
        if (coverFile == null || coverFile.isEmpty()) return null;
        try {
            Files.createDirectories(imageDir());
            Files.createDirectories(runtimeImageDir());
            String ext = extName(Objects.requireNonNull(coverFile.getOriginalFilename()));
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
