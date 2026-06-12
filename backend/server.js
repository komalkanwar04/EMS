require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const helmet = require("helmet");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employee");
const leaveRoutes = require("./routes/leave");
const recruitmentRoutes = require("./routes/recruitment");
const assetRoutes = require("./routes/asset");
const reportRoutes = require("./routes/report");
const attendanceRoutes = require("./routes/attendance");
const payrollRoutes = require("./routes/payroll");

const app = express();

// 1. Swagger OpenAPI definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PeopleSync EMS API Specification",
      version: "1.2.0",
      description: "Secure RESTful endpoints for PeopleSync Employee Management System (EMS) including leave flows and talent intake.",
    },
    servers: [
      {
        url: "http://localhost:5001",
        description: "Development Server",
      },
    ],
  },
  apis: [path.join(__dirname, "routes/*.js")],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 2. Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow swagger-ui CSS/JS inline assets
}));

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://ems-isoftzone.vercel.app",
      "https://isoftzone-02-06-26.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001"
    ];
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// 3. Mount Routes
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/recruitment", recruitmentRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/attendance", attendanceRoutes);


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

module.exports = app;