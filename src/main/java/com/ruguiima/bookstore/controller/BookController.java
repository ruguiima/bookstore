package com.ruguiima.bookstore.controller;

import com.ruguiima.bookstore.model.entity.Book;
import com.ruguiima.bookstore.model.dto.BookCreateRequest;
import com.ruguiima.bookstore.service.BookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public List<Book> listBooks() {
        return bookService.readAll();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Book> createBook(@ModelAttribute BookCreateRequest req,
                                           @RequestParam(value = "cover", required = false) MultipartFile cover) {
        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Book created = bookService.createBook(req, cover);
        return ResponseEntity.ok(created);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Book> updateBook(@PathVariable Long id,
                                           @ModelAttribute BookCreateRequest req,
                                           @RequestParam(value = "cover", required = false) MultipartFile cover) {
        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Book updated = bookService.updateBook(id, req, cover);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        boolean deleted = bookService.deleteBook(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().build();
    }
}
