package com.ruguiima.bookstore.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping({"/", "/index"})
    public String index() {
        // 返回 templates/index.html
        return "index";
    }

    @GetMapping("/login")
    public String login() {
        // 简单返回登录页，不做任何登录逻辑
        return "login";
    }

    @GetMapping("/upload")
    public String upload() {
        // 返回上传页面
        return "upload";
    }
}
