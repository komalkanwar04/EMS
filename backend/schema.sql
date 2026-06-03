-- Database schema for Employee Profile Management System

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS employee_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id),
  phone VARCHAR(20),
  address TEXT,
  designation VARCHAR(100),
  salary NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_images (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS employee_skills (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
  skill_id INT REFERENCES skills(id) ON DELETE CASCADE
);

INSERT INTO departments (department_name)
VALUES
  ('IT'),
  ('HR'),
  ('Finance'),
  ('Marketing')
ON CONFLICT DO NOTHING;

INSERT INTO skills (skill_name)
VALUES
  ('React'),
  ('NodeJS'),
  ('PostgreSQL'),
  ('Python'),
  ('Java')
ON CONFLICT DO NOTHING;
