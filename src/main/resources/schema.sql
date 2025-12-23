CREATE TABLE IF NOT EXISTS book (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    category VARCHAR(255),
    price DOUBLE,
    original_price DOUBLE,
    rating DOUBLE,
    description VARCHAR(2000),
    keywords VARCHAR(2000),
    cover VARCHAR(512)
);
