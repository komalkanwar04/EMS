-- Database schema for Employee Profile Management System

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  reset_otp VARCHAR(10),
  reset_otp_expiry TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP
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
  image_url TEXT NOT NULL,
  file_type VARCHAR(50) DEFAULT 'document',
  file_name VARCHAR(255)
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

CREATE TABLE IF NOT EXISTS leave_types (
  id SERIAL PRIMARY KEY,
  leave_name VARCHAR(50) UNIQUE NOT NULL,
  total_days INT NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
  leave_type_id INT REFERENCES leave_types(id) ON DELETE CASCADE,
  available_days INT NOT NULL,
  UNIQUE(employee_id, leave_type_id)
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
  leave_type_id INT REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'Pending Manager Approval',
  manager_id INT REFERENCES users(id) ON DELETE SET NULL,
  hr_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_history (
  id SERIAL PRIMARY KEY,
  leave_id INT REFERENCES leave_applications(id) ON DELETE CASCADE,
  approved_by INT REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  remarks TEXT,
  action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recruitment_applications (
  id SERIAL PRIMARY KEY,
  candidate_name VARCHAR(100) NOT NULL,
  candidate_email VARCHAR(100) NOT NULL,
  candidate_phone VARCHAR(20),
  application_type VARCHAR(20) NOT NULL, -- 'Job' or 'Internship'
  department_id INT REFERENCES departments(id) ON DELETE SET NULL, -- Domain
  designation VARCHAR(100) NOT NULL,
  resume_url TEXT,
  status VARCHAR(50) DEFAULT 'Pending Review', -- 'Pending Review', 'Shortlisted', 'Rejected', 'Hired'
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  asset_code VARCHAR(50) UNIQUE NOT NULL,
  asset_name VARCHAR(200) NOT NULL,
  asset_type VARCHAR(100) NOT NULL,
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  status VARCHAR(50) DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_allocations (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
  employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
  allocated_by INT REFERENCES users(id) ON DELETE SET NULL,
  allocated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_date DATE,
  status VARCHAR(50) DEFAULT 'Active',
  remarks TEXT
);

CREATE TABLE IF NOT EXISTS asset_history (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  remarks TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
