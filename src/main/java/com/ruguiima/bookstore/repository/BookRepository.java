package com.ruguiima.bookstore.repository;

import com.ruguiima.bookstore.model.entity.Book;
import java.util.List;

public interface BookRepository {
    List<Book> findAll();
    Book save(Book book);
}

