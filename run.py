import sqlite3
import bcrypt
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    current_user,
    logout_user,
    login_required
)

app = Flask(__name__)
app.secret_key = "supersecretkey"

# Initialize Flask-Login
login_manager = LoginManager(app)
login_manager.login_view = 'login_page'  # Redirects unauthorized users to the login page

status_bar = ['Applied', 'Rejected', 'Interview', 'Offer']

# Define a User class for Flask-Login
class User(UserMixin):
    def __init__(self, id, username, email, password):
        self.id = id
        self.username = username
        self.email = email
        self.password = password

# User loader callback for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id, username, email, password FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if user is None:
            return None
        return User(*user)

# Create the tables for the database
def create_tables():
    connection = sqlite3.connect("job_tracker.db")
    connection.execute("PRAGMA foreign_keys = ON")
    cursor = connection.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            password TEXT NOT NULL)
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS job_applications(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            company_name TEXT NOT NULL,
            date_applied TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id))
    ''')

    connection.commit()
    connection.close()

@app.route("/")
def home():
    return render_template("login_page.html")

@app.route("/sign_up")
def sign_up():
    return render_template("sign_up.html")

@app.route("/login_page")
def login_page():
    return render_template("login_page.html")

# Protect the dashboard using Flask-Login's decorator
@app.route("/dashboard")
@login_required
def dashboard():
    user_id = current_user.id
    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM job_applications WHERE user_id = ?", (user_id,))
        results = cursor.fetchall()
    return render_template("dashboard.html", results=results)

# Register a new user
@app.route("/register_users", methods=["POST"])
def register_users():
    username = request.form["username"]
    email = request.form["email"]
    password = request.form["password"]
    confirm_password = request.form["confirm_password"]

    if not username or not email or not password:
        flash("All fields are required!", "error")
        return redirect(url_for("sign_up"))
    
    if password != confirm_password:
        flash("Passwords do not match", "error")
        return redirect(url_for("sign_up"))
    
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        try:
            cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
            if cursor.fetchone():
                flash("Username or email already exists", "error")
                return redirect(url_for("sign_up"))
            
            cursor.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                           (username, email, hashed_password))
            connection.commit()
            flash("Registration successful! Please log in.", "success")
            return redirect(url_for("login_page"))
        except sqlite3.IntegrityError as e:
            flash("Database constraint error: " + str(e), "error")
            return redirect(url_for("sign_up"))

# Login endpoint using Flask-Login's login_user
@app.route("/login", methods=["POST"])
def login():
    username = request.form["username"]
    password = request.form["password"]

    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id, password, username, email FROM users WHERE username = ?", (username,))
        result = cursor.fetchone()

        if not result:
            flash("Invalid username or password.", "error")
            return redirect(url_for("login_page"))

        user_id, stored_password, user_name, user_email = result
        if bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8")):
            user = User(user_id, user_name, user_email, stored_password)
            login_user(user)  # Manage the user session with Flask-Login
            flash("Login successful!", "success")
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid username or password.", "error")
            return redirect(url_for("login_page"))

# Logout endpoint
@app.route('/logout')
@login_required
def logout():
    logout_user()  # Flask-Login handles session cleanup
    flash("You have been logged out.", "success")
    return redirect(url_for('login_page'))

# Add a job application (requires login)
@app.route("/add_job", methods=["POST"])
@login_required
def add_job():
    data = request.get_json()
    user_id = current_user.id
    company = data.get("company")
    title = data.get("title")
    status = data.get("status")
    date_applied = data.get("date_applied")
    notes = data.get("notes")

    if not company or not title or not status or not date_applied:
        return jsonify({"success": False, "message": "All fields are required!"})
    
    try:
        # Convert the date string into a date object
        date = datetime.strptime(date_applied, '%Y-%m-%d').date()
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
                INSERT INTO job_applications (user_id, title, company_name, date_applied, status, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, title, company, date, status, notes))
            connection.commit()
        return jsonify({"success": True, "message": "Job added successfully!"})
    except sqlite3.IntegrityError as e:
        return jsonify({"success": False, "message": str(e)})

# Helper: check if a user exists
def user_exists(user_id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        return cursor.fetchone() is not None

# Helper: check if job application ID exists
def valid_id(job_id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('SELECT id FROM job_applications WHERE id = ?', (job_id,))
        return cursor.fetchone() is not None

# Delete jobs endpoint (requires login)
@app.route('/delete-job', methods=["POST"])
@login_required
def delete_jobs():
    try:
        data = request.get_json()
        job_ids = data.get("job_ids", [])
        if not job_ids:
            return jsonify({"success": False, "message": "No job IDs provided."})
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.executemany("DELETE FROM job_applications WHERE id = ?",
                               [(job_id,) for job_id in job_ids])
        return jsonify({"success": True, "message": "Job(s) deleted successfully."})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Invalid job ID(s) provided."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

# Update job application status
def update_status(user_id, job_id, new_status):
    try:
        if not valid_id(job_id):
            raise ValueError(f"{job_id} is an invalid ID.")
        if not user_exists(user_id):
            raise ValueError(f"{user_id} doesn't exist")
        if new_status not in status_bar:
            raise ValueError("Invalid status")
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
                UPDATE job_applications
                SET status = ?
                WHERE user_id = ? AND id = ?
            ''', (new_status, user_id, job_id))
    except sqlite3.IntegrityError as e:
        return "Use valid status"

# Delete user account (helper function)
def delete_users(username, id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('DELETE FROM users WHERE username = ? and id = ?', (username, id))

# Search for job applications
@app.route("/search", methods=["POST"])
@login_required
def search():
    data = request.get_json()
    query = data.get("query", "")
    user_id = current_user.id
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute("""
        SELECT * FROM job_applications
        WHERE user_id = ? AND (company_name LIKE ? OR title LIKE ? OR notes LIKE ?)
    """, (user_id, f'%{query}%', f'%{query}%', f'%{query}%'))
        results = cursor.fetchall()
    jobs = []
    for row in results:
        jobs.append({
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "company_name": row[3],
            "date_applied": row[4],
            "status": row[5],
            "notes": row[6]
        })
    return jsonify({"success": True, "results": jobs})


@app.route("/advanced_filter", methods=["POST"])
@login_required
def advanced_filter():
    data = request.get_json()
    statuses = data.get("status", [])   # Expecting a list of statuses
    date_from = data.get("date_from", None)
    date_to = data.get("date_to", None)
    
    query = "SELECT * FROM job_applications WHERE user_id = ?"
    params = [current_user.id]
    
    if statuses:
        # Build an IN clause with the selected statuses
        placeholders = ','.join('?' * len(statuses))
        query += f" AND status COLLATE NOCASE IN ({placeholders})"
        params.extend(statuses)
    
    if date_from:
        query += " AND date_applied >= ?"
        params.append(date_from)
    
    if date_to:
        query += " AND date_applied <= ?"
        params.append(date_to)
    
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute(query, params)
        results = cursor.fetchall()
    
    jobs = []
    for row in results:
        jobs.append({
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "company_name": row[3],
            "date_applied": row[4],
            "status": row[5],
            "notes": row[6]
        })
    
    return jsonify({"success": True, "results": jobs})



if __name__ == "__main__":
    create_tables()
    app.run(debug=True)
