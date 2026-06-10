const axios = require('axios');

(async () => {
  try {
    const response = await axios.get('http://localhost:5001/api/employees/list-public');
    console.log('Employee profiles fetched successfully:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Failed to fetch employee profiles:', error.message);
  }
})();
