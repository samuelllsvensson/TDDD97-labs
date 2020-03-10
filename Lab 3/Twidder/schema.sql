DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS logged_in;
DROP TABLE IF EXISTS wall_of_text;

CREATE TABLE users(
  email varchar(40) NOT NULL,
  pwd varchar(12) NOT NULL,
  firstName varchar(40) NOT NULL,
  familyName varchar(40) NOT NULL,
  gender varchar(7) NOT NULL,
  city varchar(40) NOT NULL,
  country varchar(40) NOT NULL,

  PRIMARY KEY(email)
);

CREATE TABLE logged_in(
  email varchar(40) NOT NULL,
  token varchar(40) NOT NULL UNIQUE,

  PRIMARY KEY(email),
  FOREIGN KEY('email') REFERENCES users(email)
);

CREATE TABLE wall_of_text(
  id integer primary key autoincrement,
  receiver varchar(40) NOT NULL,
  sender varchar(40) NOT NULL,
  message varchar(128) NOT NULL,

  FOREIGN KEY(receiver) REFERENCES users(email),
  FOREIGN KEY(sender) REFERENCES users(email)
);
