document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("job_modal");
    const openModalBtn = document.getElementById("openModalBtn");
    const closeModalBtns = document.querySelectorAll(".close, .close-modal");
    const jobForm = document.getElementById("jobForm");
    const tableContent = document.querySelector(".table-content");
    const deleteJob = document.getElementById("delete-button");
    


    
    // Open Modal
    if (openModalBtn) {
        openModalBtn.addEventListener("click", () => {
            modal.style.display = "block";
        });
    }

    // Close Modal
    closeModalBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    });

    // Close Modal if Clicking Outside
    window.addEventListener("click", event => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Handle Form Submission
    if (jobForm) {
        jobForm.addEventListener("submit", (event) => {
            event.preventDefault();

            // Get form values
            const formData = new FormData(jobForm);
            const jobData = {
                company: formData.get("company"),  // ✅ Fixed typo
                title: formData.get("title"),
                status: formData.get("status"),
                date_applied: formData.get("date_applied"),
                notes: formData.get("notes")
            };

            // Send data to Flask using Fetch API
            fetch("/add_job", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(jobData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Add job entry to the table dynamically
                    const newRow = document.createElement("div");
                    newRow.classList.add("table-row");
                    newRow.innerHTML = `
                        <input type="checkbox">
                        <span>${jobData.company}</span>
                        <span>${jobData.title}</span>
                        <span>${jobData.status}</span>
                        <span>${jobData.date_applied}</span>
                        <span>${jobData.notes}</span>
                    `;
                    tableContent.prepend(newRow); // Add new row at the top

                    // Close modal & reset form
                    modal.style.display = "none";
                    jobForm.reset();  // ✅ Fixed typo
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => console.error("Error:", error));
        });
    }

    // Handle the job delete part
    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("checkbox")) {
            const checkBoxes = document.querySelectorAll(".checkbox");
            const anyChecked = [...checkBoxes].some(cb => cb.checked);
            
            if(anyChecked){
                deleteJob.classList.add("show");
            }else{
                deleteJob.classList.remove("show");
            }
        }
    });

    deleteJob.addEventListener("click", () => {
        const checkedRows = document.querySelectorAll(".checkbox:checked");
        if (checkedRows.length === 0) return;

        if (!confirm("Are you sure you want to delete the selected jobs?")) return;

        const jobIds = [...checkedRows].map(cb => cb.closest(".table-row").dataset.id);

        // Send request to Flask backend to delete jobs
        fetch("/delete-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_ids: jobIds }) // Send array of IDs
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove deleted rows from UI
                checkedRows.forEach(cb => cb.closest(".table-row").remove());
                deleteJob.classList.remove("show"); // Hide button after delete
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => console.error("Error:", error));
    });

});
