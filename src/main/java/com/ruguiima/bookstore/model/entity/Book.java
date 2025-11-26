package com.ruguiima.bookstore.model.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Book {
    private Integer id;            // 自增ID
    private String title;          // 必填
    private String author;         // 可空
    private String category;       // 可空
    private Double price;          // 可空
    private Double originalPrice;  // 可空
    private Double rating;         // 可空 (0-5)
    private String desc;           // 可空
    @Singular("keyword")
    private List<String> keywords; // 可空
    private String cover;          // 可空(图片路径)
}
