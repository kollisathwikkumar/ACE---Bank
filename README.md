# 🏦 ACE Bank — Online Banking Application

A full-stack **online banking web application** built with Java Servlets, JSP, MySQL, and modern HTML/CSS/JavaScript. Features a sleek, premium banking UI with real-time transaction management, analytics, and secure authentication.

---

## ✨ Features

### 🔐 Authentication & Security
- **User Registration & Login** — Secure sign-up with encrypted passwords (BCrypt)
- **OTP Login** — Forgot password? Login via email OTP
- **Session Management** — Server-side sessions with auth filter protection
- **Input Validation** — Server-side validation for all forms

### 💰 Banking Operations
- **Fund Transfer** — Transfer money between accounts
- **Deposits** — Deposit funds into your account
- **Bill Payments** — Pay bills directly from dashboard
- **Transaction History** — Full transaction log persisted in SQL

### 📊 Dashboard & Analytics
- **Interactive Dashboard** — Real-time balance, recent transactions, quick actions
- **Spending Analytics** — Dynamic income/expense breakdown with charts
- **Spending Categories** — Visual donut chart for spending breakdown

### 🏗️ Account Management
- **Savings & Current Accounts** — Dedicated onboarding flows for each type
- **Profile Management** — View and manage user profile
- **Credit Score** — Credit score tracking page
- **Cards Management** — Card overview and management
- **Investments** — Investment tracking dashboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | Java 21, Jakarta Servlets, JSP |
| **Database** | MySQL 8.x |
| **Server** | Apache Tomcat 10.1 |
| **Build Tool** | Maven |
| **Auth** | BCrypt (jBCrypt), Server-side Sessions |
| **Email** | Jakarta Mail (for OTP) |
| **JSON** | Gson |
| **Config** | SnakeYAML |

---

## 📁 Project Structure

```
ace-bank-lite/
├── src/main/
│   ├── java/com/acebank/lite/
│   │   ├── controllers/       # Servlets & REST API endpoints
│   │   │   ├── ApiSignUp.java
│   │   │   ├── ApiLogin.java
│   │   │   ├── ApiOtpSend.java
│   │   │   ├── ApiOtpVerify.java
│   │   │   ├── ApiBalance.java
│   │   │   ├── ApiTransactions.java
│   │   │   ├── ApiTransfer.java
│   │   │   ├── ApiDeposit.java
│   │   │   ├── ApiPayment.java
│   │   │   └── ApiAnalytics.java
│   │   ├── dao/               # Data Access Layer (MySQL)
│   │   ├── service/           # Business Logic Layer
│   │   ├── models/            # Data Models (User, Account, Transaction)
│   │   ├── filters/           # Auth Filter
│   │   └── util/              # Utilities (DB, Mail, Config, Password)
│   ├── resources/
│   │   ├── sql/               # SQL schema & queries
│   │   └── application-dev.properties
│   └── webapp/
│       ├── dashboard.html     # Main dashboard
│       ├── transactions.html  # Transaction history
│       ├── login.jsp          # Login page with OTP
│       ├── sign-up.jsp        # Account onboarding
│       ├── profile.html       # User profile
│       ├── cards.html         # Cards management
│       ├── investments.html   # Investments page
│       ├── credit-score.html  # Credit score
│       └── js/                # Frontend JavaScript modules
└── pom.xml                    # Maven build config
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/signup` | User registration |
| `POST` | `/api/login` | User login |
| `POST` | `/api/otp/send` | Send OTP to email |
| `POST` | `/api/otp/verify` | Verify OTP & login |
| `GET` | `/api/balance` | Get account balance |
| `GET` | `/api/transactions` | Get transaction history |
| `POST` | `/api/transfer` | Transfer funds |
| `POST` | `/api/deposit` | Deposit money |
| `POST` | `/api/payment` | Bill payment |
| `GET` | `/api/analytics` | Spending & income analytics |

---

## 🚀 Getting Started

### Prerequisites
- **Java 21** (JDK)
- **Apache Tomcat 10.1+**
- **MySQL 8.x**
- **Maven 3.x**

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/kollisathwikkumar/ACE---Bank.git
   cd ACE---Bank
   ```

2. **Set up MySQL database**
   - Create a database named `acebank`
   - Run the schema from `src/main/resources/sql/schema_initializer.sql`

3. **Configure database credentials**
   - Copy `src/main/resources/application-dev.properties.template` to `application-dev.properties`
   - Update with your MySQL username, password, and connection URL

4. **Build the project**
   ```bash
   mvn clean package
   ```

5. **Deploy to Tomcat**
   - Copy the generated `target/LaceBank.war` to Tomcat's `webapps/` directory
   - Start Tomcat and open `http://localhost:8080/LaceBank`

---

## 📦 Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Jakarta Servlet API | 6.0.0 | Servlet framework |
| MySQL Connector/J | 8.4.0 | Database connectivity |
| Gson | 2.11.0 | JSON serialization |
| jBCrypt | 0.4 | Password hashing |
| Jakarta Mail | 2.0.5 | Email OTP service |
| SnakeYAML | 2.5 | YAML config parsing |
| Lombok | 1.18.42 | Boilerplate reduction |
| MyBatis | 3.5.19 | SQL mapping framework |
| JSTL | 3.0.0 | JSP tag library |

---

## 👤 Author

**Kolli Sathwik Kumar**

---

## 📄 License

This project is for educational purposes.
