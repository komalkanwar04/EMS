const API_BASE = "http://localhost:5001";
let cookieHeader = "";

async function makeRequest(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const error = new Error(`HTTP Error ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return { data, headers: res.headers };
}

async function runTests() {
  console.log("Starting backend Reports API test suite using native fetch...");

  try {
    // 1. Log in as admin
    console.log("Logging in as pranay@isoftzone.com...");
    const loginRes = await makeRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "pranay@isoftzone.com",
        password: "123456"
      })
    });
    
    // Save cookies from response headers
    const setCookie = loginRes.headers.get("set-cookie");
    if (setCookie) {
      cookieHeader = setCookie.split(";")[0];
      console.log("Login successful! Token cookie configured.");
    }

    // 2. Fetch Employee Report with filters
    console.log("Fetching Employee Reports (All)...");
    const empResAll = await makeRequest("/api/reports/employees");
    console.log(`- Total employees found: ${empResAll.data.employees.length}`);

    console.log("Fetching Employee Reports for Department ID = 1 (Software Development)...");
    const empResFiltered = await makeRequest("/api/reports/employees?department_id=1");
    console.log(`- Employees in Software Development: ${empResFiltered.data.employees.length}`);
    if (empResFiltered.data.employees.length > 0) {
      console.log(`- Sample name: ${empResFiltered.data.employees[0].name}, Designation: ${empResFiltered.data.employees[0].designation}`);
    }

    // 3. Fetch Leave Report with filters
    console.log("Fetching Leave Reports (All)...");
    const leaveResAll = await makeRequest("/api/reports/leaves");
    console.log(`- Total leave records found: ${leaveResAll.data.leaves.length}`);

    console.log("Fetching Leave Reports for status = 'Approved'...");
    const leaveResApproved = await makeRequest("/api/reports/leaves?status=Approved");
    console.log(`- Approved leave count: ${leaveResApproved.data.leaves.length}`);
    if (leaveResApproved.data.leaves.length > 0) {
      console.log(`- Sample leave: Employee: ${leaveResApproved.data.leaves[0].employee_name}, Type: ${leaveResApproved.data.leaves[0].leave_name}, Status: ${leaveResApproved.data.leaves[0].status}`);
    }

    // 4. Fetch Asset Report with filters
    console.log("Fetching Asset Reports (All)...");
    const assetResAll = await makeRequest("/api/reports/assets");
    console.log(`- Total assets in inventory: ${assetResAll.data.assets.length}`);

    console.log("Fetching Asset Reports for type = 'Laptop' and status = 'Allocated'...");
    const assetResFiltered = await makeRequest("/api/reports/assets?asset_type=Laptop&status=Allocated");
    console.log(`- Allocated laptops count: ${assetResFiltered.data.assets.length}`);
    if (assetResFiltered.data.assets.length > 0) {
      console.log(`- Sample asset: Code: ${assetResFiltered.data.assets[0].asset_code}, Name: ${assetResFiltered.data.assets[0].asset_name}, Owner: ${assetResFiltered.data.assets[0].current_owner}`);
    }

    console.log("All reporting API test scenarios executed successfully!");
  } catch (err) {
    console.error("Test execution encountered an error:", err.message);
    if (err.data) {
      console.error("Error data:", err.data);
    }
  }
}

runTests();
