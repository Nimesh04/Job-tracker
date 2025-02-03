import sqlite3
import bcrypt
from datetime import datetime 
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify


app = Flask(__name__)
app.secret_key = "supersecretkey"



status_bar = ['Applied', 'Rejected', 'Interview', 'Offer']

# create the tables for the database
def create_tables():
    connection  = sqlite3.connect("job_tracker.db")
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
    '''
    )

    connection.commit()
    connection.close()


# register a user and add it to the database
@app.route("/")
def home():
    return render_template("sign_up.html")


@app.route("/sign_up")
def sign_up():
    return render_template("sign_up.html")


@app.route("/login_page")
def login_page():
    return render_template("login_page.html")

@app.route("/dashboard")
def dashboard():

    user_id = session["user_id"]

    if not user_id:
        flash("Please log in to access the dashboard.", "error")
        return redirect(url_for("login_page"))

    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM job_applications WHERE user_id = ?", (user_id,))
        results = cursor.fetchall()


    return render_template("dashboard.html", results=results)

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
        flash("Password is different", "error")
        return redirect(url_for("sign_up"))
    
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        #checking if the username or the email already exsits in the database or not. if it doesn't then the new user is added.
        try:
            user_name = cursor.execute('''SELECT id FROM USERS WHERE username = ? or email= ?''',(username, email,))
            if user_name.fetchone():
                flash ("Username or email already exists", "error")
                return redirect(url_for("sign_up"))
            
            cursor.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", (username, email, hashed_password))
            connection.commit()
            flash("Registration successful! Please log in.", "success")
            return redirect(url_for("login_page"))
        except sqlite3.IntegrityError as e:
            flash("Database constraint error: " + str(e), "error")
            return redirect(url_for("sign_up"))
        


# need to verify if the user is persent in the database or not.
@app.route("/login", methods=["POST"])
def login():
    username = request.form["username"]
    password = request.form["password"]

    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT password, id FROM users WHERE username = ?", (username,))
        result = cursor.fetchone()

        if not result:
            flash("Invalid username or password.", "error")
            return redirect(url_for("login_page"))

        stored_password, user_id = result
        if bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8")):
            session["user_id"] = user_id
            flash("Login successful!", "success")
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid username or password.", "error")
            return redirect(url_for("login_page"))

#check if the user_id exists
def user_exists(user_id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('''
            SELECT * from users 
            WHERE id = ?''', (user_id,))
        return cursor.fetchone() is not None


#add the jobs and all the detail in the table
@app.route("/add_job", methods=["POST"])
def add_job():
    if "user_id" not in session:
        return jsonify({"success":False, "message": "User not logged in"}), 401
    
    data = request.get_json()
    user_id = session["user_id"]
    company = data.get("company")
    title = data.get("title")
    status = data.get("status")
    date_applied = data.get("date_applied")
    notes = data.get("notes")

    if not company or not title or not status or not date_applied:
        return jsonify({"success": False, "message": "All fields are required!"})
    
    try:
        #convert the date string into the date
        date = datetime.strptime(date_applied, '%Y-%m-%d').date()

        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()

            cursor.execute('''
                INSERT into job_applications (user_id, title, company_name, date_applied, status, notes)
                        VALUES(?,?,?,?,?,?)
                        ''', (user_id, title, company, date, status, notes))
            
            connection.commit()

        return jsonify({"success": True, "message": "Job added successfully!"})
    except sqlite3.IntegrityError as e:
        return jsonify({"success": False, "message": str(e)})


def valid_id(id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('''
            SELECT id FROM job_applications WHERE id = ?
        ''', (id,))
        return cursor.fetchone() is not None



# remove the job based on the id from the job tracker database
@app.route('/delete-job', methods=["POST"])
def delete_jobs():
    try:
        data = request.get_json()
        job_ids = data.get("job_ids", [])

        if not job_ids:
            return jsonify({"success": False, "message": "No job IDs provided."})

        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.executemany("DELETE FROM job_applications WHERE id = ?", [(job_id,) for job_id in job_ids])

        return jsonify({"success": True, "message": "Job(s) deleted successfully."})

    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Invalid job ID(s) provided."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


#update the status part of the job tracking
def update_status(user_id, id, new_status):
    try:
        if not valid_id(id):
            raise ValueError(f"{id} is an invalid ID.")
        if not user_exists(user_id):
            raise ValueError(f"{user_id} doesn't exist")
        if new_status not in status_bar:
            raise ValueError("Invalid status")
        
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
                    UPDATE job_applications
                           SET status = ?
                           WHERE user_id= ? AND id = ?
                           ''', (new_status, user_id, id,))

    except sqlite3.IntegrityError as e:
        return "Use valid status"


#delete users account
def delete_users(username, id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('DELETE FROM users WHERE username = ? and id = ? ', (username, id))

#Next things that need to be implemented
# Search and filter functionality for jobs
def search(word):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        try:
            cursor.execute('''
                           SELECT * FROM job_applications
                           WHERE title COLLATE NOCASE LIKE ? 
                           or company_name COLLATE NOCASE LIKE ? 
                           or status COLLATE NOCASE LIKE ?
                           ''', (f'%{word}%', f'%{word}%', f'%{word}%',) )
            search_result = cursor.fetchall()
            for result in search_result:
                print(result)
        except sqlite3.IntegrityError as e:
            raise ("Error:",str(e))



#filter functionality
def filter(user_column, user_filter):
    column_map = {
    'status': 'status',
    'date': 'date'
    }

    user_input = {
    'status': None,
    'date': None
    }

    if user_column not in column_map:
        print("Invalid column name")

    if user_column.lower() == 'status':
        filters = [status.strip().capitalize() for status in user_filter.split(',')]
        invalid_filters = [status for status in filters if status not in status_bar ]
        if invalid_filters:
            print('Invalid filters')
    else:
        filters = [user_filter]

    column_name = column_map[user_column]
    if len(filters) > 1:
        placeholder = ', '.join(['?'] * len(filters))
        query = f'''
        SELECT * FROM job_applications
        WHERE {column_name} COLLATE NOCASE IN ({placeholder})
        '''
    else:
        query = f'''
        SELECT * FROM job_applications
        WHERE {column_name} COLLATE NOCASE = ?
        '''
    try:
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.execute(query, filters)
            filter_result = cursor.fetchall()
            for result in filter_result:
                print(result)
    except sqlite3.InterfaceError as e:
        raise ("Error, ", str(e))


if __name__ == "__main__":
    create_tables()
    app.run(debug=True)