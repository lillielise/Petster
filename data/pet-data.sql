DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS favorite_pets;

CREATE TABLE pets (
  id SERIAL PRIMARY KEY,
  petfinderid VARCHAR(255),
  type VARCHAR(255),
  name VARCHAR(255),
  age VARCHAR(255),
  gender VARCHAR(255),
  size VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  description TEXT,
  photo VARCHAR(255),
  url TEXT
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255)
);

CREATE TABLE favorite_pets (
  id SERIAL PRIMARY KEY,
  pet_id VARCHAR(255),
  username_id INT
);

INSERT INTO pets (petfinderid, type, name, age, gender, size, city, state, description, photo, url)
VALUES('111','Cat','Merida','Young','Female','Medium','Orange','CA','Very sweet, she gets along with other dogs', 'https://dl5zpyw5k3jeb.cloudfront.net/photos/pets/45078342/1/?bust=1561486424', 'https://www.petfinder.com/dog/spot-120/nj/jersey-city/nj333-petfinder-test-account/?referrer_id=d7e3700b-2e07-11e9-b3f3-0800275f82b1');

INSERT INTO users (username)
VALUES('Bob');

INSERT INTO favorite_pets (pet_id, username_id)
VALUES('111', 1);
