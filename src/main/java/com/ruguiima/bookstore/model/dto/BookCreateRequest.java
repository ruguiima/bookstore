package com.ruguiima.bookstore.model.dto;

import lombok.Data;

/**
 * 图书创建请求 DTO：封装上传表单的可空字段（除标题外全部可空）。
 * 所有数值类字段保留为 String，便于在 Service 层统一解析与容错。
 */
@Data
public class BookCreateRequest {
    private String title;          // 必填
    private String author;         // 可空
    private String category;       // 可空
    private String price;          // 可空 (String -> Double)
    private String originalPrice;  // 可空
    private String rating;         // 可空 (0-5)
    private String desc;           // 可空
    private String keywords;       // 可空，多分隔符
}
