package com.ruguiima.bookstore.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruguiima.bookstore.model.entity.Book;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class JsonBookRepository implements BookRepository {
    private final ObjectMapper mapper;

    private Path dataPath() {
        return Path.of(System.getProperty("user.dir"), "src", "main", "resources", "data", "books.json");
    }

    @Override
    public synchronized List<Book> findAll() {
        try {
            Path p = dataPath();
            if (!Files.exists(p)) return new ArrayList<>();
            try (InputStream in = Files.newInputStream(p)) {
                return mapper.readValue(in, new TypeReference<>() {
                });
            }
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    @Override
    public synchronized Book save(Book book) {
        List<Book> all = findAll();
        all.add(book);
        writeAll(all);
        return book;
    }

    private void writeAll(List<Book> list) {
        try {
            Path p = dataPath();
            Files.createDirectories(p.getParent());
            try (FileOutputStream out = new FileOutputStream(p.toFile())) {
                // 使用漂亮打印（换行缩进）
                mapper.writerWithDefaultPrettyPrinter().writeValue(out, list);
            }
        } catch (Exception ignored) {
        }
    }
}
