package com.ruguiima.bookstore.repository;

import com.ruguiima.bookstore.model.entity.Book;
import com.ruguiima.bookstore.repository.handler.StringListTypeHandler;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * Book数据访问层Mapper接口
 * 注意：SQL中的'book'表在应用启动时通过schema.sql创建，IDE可能无法静态解析
 */
@Mapper
public interface BookMapper {
    @Select("SELECT * FROM book ORDER BY id")
    @Results({
            @Result(column = "keywords", property = "keywords", typeHandler = StringListTypeHandler.class)
    })
    List<Book> findAll();

    @Select("SELECT * FROM book WHERE id = #{id}")
    @Results({
            @Result(column = "keywords", property = "keywords", typeHandler = StringListTypeHandler.class)
    })
    Book findById(Integer id);

    @Insert("""
            INSERT INTO book SET
            title          = #{title},
            author         = #{author},
            category       = #{category},
            price          = #{price},
            original_price = #{originalPrice},
            rating         = #{rating},
            description    = #{description},
            keywords       = #{keywords, typeHandler=com.ruguiima.bookstore.repository.handler.StringListTypeHandler},
            cover          = #{cover}
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    @SuppressWarnings("UnusedReturnValue")
    int insert(Book book);

    @Update("""
            UPDATE book SET 
            title = #{title}, 
            author = #{author}, 
            category = #{category}, 
            price = #{price}, 
            original_price = #{originalPrice}, 
            rating = #{rating}, 
            description = #{description}, 
            keywords = #{keywords, typeHandler=com.ruguiima.bookstore.repository.handler.StringListTypeHandler},
            cover = #{cover}
            WHERE id = #{id}
            """)
    @SuppressWarnings("UnusedReturnValue")
    int update(Book book);

    @Update("UPDATE book SET cover = #{cover} WHERE id = #{id}")
    @SuppressWarnings("UnusedReturnValue")
    int updateCover(@Param("id") Integer id, @Param("cover") String cover);

    @Delete("DELETE FROM book WHERE id = #{id}")
    @SuppressWarnings("UnusedReturnValue")
    int deleteById(Integer id);
}