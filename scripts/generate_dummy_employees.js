// generate_dummy_employees.js
// Generates 100 dummy employee objects and writes them to dummy_employees.json
// This script does not require a database connection.

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

const TOTAL = 100;

function createEmployee(i) {
  const name = faker.person.fullName();
  const email = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] });
  const phone = faker.phone.number();
  const address = faker.location.streetAddress();
  const designation = faker.person.jobTitle();
  const salary = Math.floor(Math.random() * 40000) + 30000;
  const departmentId = Math.floor(Math.random() * 5) + 1; // placeholder dept id
  return {
    id: i + 1,
    name,
    email,
    phone,
    address,
    designation,
    salary,
    departmentId,
  };
}

const employees = [];
for (let i = 0; i < TOTAL; i++) {
  employees.push(createEmployee(i));
}

const outputPath = path.join(__dirname, 'dummy_employees.json');
fs.writeFileSync(outputPath, JSON.stringify(employees, null, 2));
console.log(`Generated ${TOTAL} dummy employee records at ${outputPath}`);
