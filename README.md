### **Job Tracker Application**

---

### **Project Overview**
The **Job Tracker Application** is a Python-based project designed to help users efficiently manage and track their job applications. It allows users to register, log in, and perform various operations such as adding job applications, searching, filtering, updating statuses, and deleting records. The project uses **SQLite** for data storage and **bcrypt** for secure password management.

---

### **Key Features**
1. **User Management**:
   - User registration with validation for unique usernames and emails.
   - Secure password storage using `bcrypt`.
   - User login functionality with validation.

2. **Job Application Management**:
   - Add job applications with fields like title, company name, date applied, status, and notes.
   - Update the status of job applications (e.g., "Applied", "Rejected", "Interview", "Offer").
   - Delete job applications by their ID.

3. **Search and Filter**:
   - Search for job applications by title, company name, or status.
   - Filter job applications dynamically by status, date, or other fields with support for multiple values.

4. **Data Integrity**:
   - Ensures relational consistency using foreign keys between users and their job applications.

5. **Interactive User Interface**:
   - Command-line prompts for various actions such as adding, viewing, searching, and filtering job applications.

---

### **Tech Stack**
- **Language**: Python
- **Database**: SQLite
- **Libraries**:
  - `bcrypt` for password hashing.
  - `datetime` for date handling.
  - `sqlite3` for database operations.

---

### **How to Use**
1. **Setup**:
   - Ensure Python is installed on your machine.
   - Install required libraries using:
     ```bash
     pip install bcrypt
     ```

2. **Run the Application**:
   - Execute the script in your terminal:
     ```bash
     python job_tracker.py
     ```

3. **Features**:
   - Register as a new user.
   - Log in with your credentials.
   - Add job applications with details like title, company name, date applied, status, and notes.
   - Search and filter job applications by various criteria.
   - Update job statuses or delete applications as needed.

---

### **Planned Enhancements**
- **User Authentication**:
  - Implement session management for secure user access.
- **Search and Filter Improvements**:
  - Add support for range queries (e.g., date ranges) and multi-column filtering.
- **Pagination**:
  - Introduce pagination for job listings to handle large datasets.
- **Web Interface**:
  - Transition from CLI to a web-based interface using Flask.
- **Unit Testing**:
  - Add tests for critical functions to ensure reliability.

---

### **Contributions**
Contributions are welcome! Feel free to fork the repository, submit issues, or open pull requests to enhance the application.

---
