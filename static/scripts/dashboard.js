document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("job_modal");
    const openModalBtn = document.getElementById("openModalBtn");
    const closeModalBtns = document.querySelectorAll(".close, .close-modal");
    const jobForm = document.getElementById("jobForm");
    const tableContent = document.querySelector(".table-content");
    const deleteJob = document.getElementById("delete-button");
    const profileButton = document.getElementById("profile_button");
    const profileSection = document.getElementById("profile_section");
    const searchBar = document.querySelector('.search-bar');
    const searchButton = document.querySelector('.icon-button img[alt="Search"]').parentElement;
    const filterButton = document.querySelector('.icon-button img[alt="Filter"]').parentElement;
    const filterModal = document.getElementById("filter_modal");
    const filterClose = document.getElementById("filter_close");
    const filterForm = document.getElementById("filterForm");
    const resetButton = document.querySelector(".reset-filter");

    // Toggle profile dropdown visibility
    profileButton.addEventListener("click", (event) => {
        event.stopPropagation();
        profileSection.classList.toggle("show");
    });

    // Hide profile dropdown when clicking outside
    document.addEventListener("click", (event) => {
        if (!profileSection.contains(event.target) && profileSection.classList.contains("show")) {
            profileSection.classList.remove("show");
        }
    });

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
                company: formData.get("company"),  
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
                    jobForm.reset();  
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

    if(searchButton && searchBar){
        searchButton.addEventListener('click', ()=>{
            const query = searchBar.value.trim();
            fetch('/search', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({query: query})
            })
            .then(response => response.json())
            .then(data => {
                tableContent.innerHTML ='';
                if(data.success){
                    if (data.results.length > 0){
                        data.results.forEach(job => {
                            const newRow = document.createElement('div');
                            newRow.classList.add('table-row');
                            newRow.dataset.id = job.id;
                            newRow.innerHTML = `
                                <input type="checkbox">
                                <span>${job.company_name}</span>
                                <span>${job.title}</span>
                                <span>${job.status}</span>
                                <span>${job.date_applied}</span>
                                <span>${job.notes}</span>
                            `;
                            tableContent.appendChild(newRow);
                        });
                    } else {
                        const noResultRow = document.createElement('div');
                        noResultRow.classList.add('table-row');
                        noResultRow.innerHTML = `<span colspan="5"> No result found</span>`;
                        tableContent.appendChild(noResultRow);
                    }
                }else{
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => console.error("Error:", error))
        });
    }

    if (filterButton) {
        filterButton.addEventListener("click", () => {
            filterModal.style.display = "block";
        });
    }

    // Close filter modal on close button click
    if (filterClose) {
        filterClose.addEventListener("click", () => {
            filterModal.style.display = "none";
        });
    }

    // Close modal if clicking outside the modal content
    window.addEventListener("click", event => {
        if (event.target === filterModal) {
            filterModal.style.display = "none";
        }
    });

    // Handle filter form submission
    if (filterForm) {
        filterForm.addEventListener("submit", event => {
            event.preventDefault();
            
            // Gather selected columns (for display purposes)
            const selectedColumns = Array.from(filterForm.querySelectorAll('input[name="columns"]:checked')).map(input => input.value);
            
            // Gather statuses from filter form
            const selectedStatuses = Array.from(filterForm.querySelectorAll('input[name="status"]:checked')).map(input => input.value);
            
            // Gather date filters
            const dateFrom = document.getElementById("filter_date_from").value;
            const dateTo = document.getElementById("filter_date_to").value;
            
            // Send the advanced filter request
            fetch('/advanced_filter', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: selectedStatuses,
                    date_from: dateFrom,
                    date_to: dateTo
                })
            })
            .then(response => response.json())
            .then(data => {
                tableContent.innerHTML = ''; // Clear current table rows
                if (data.success) {
                    if (data.results.length > 0) {
                        data.results.forEach(job => {
                            const newRow = document.createElement("div");
                            newRow.classList.add("table-row");
                            newRow.dataset.id = job.id;
                            newRow.innerHTML = `
                                <input type="checkbox">
                                <span class="company_name">${job.company_name}</span>
                                <span class="job-title">${job.title}</span>
                                <span class="status">${job.status}</span>
                                <span class="date_applied">${job.date_applied}</span>
                                <span class="notes">${job.notes}</span>
                            `;
                            tableContent.appendChild(newRow);
                        });
                    } else {
                        const noResultRow = document.createElement("div");
                        noResultRow.classList.add("table-row");
                        noResultRow.innerHTML = '<span colspan="5">No result found</span>';
                        tableContent.appendChild(noResultRow);
                    }
                    
                    // Adjust visible columns according to the selectedColumns list
                    document.querySelectorAll(".table-row").forEach(row => {
                        if (!selectedColumns.includes("company_name")) {
                            row.querySelector(".company_name").style.display = "none";
                        } else {
                            row.querySelector(".company_name").style.display = "inline-block";
                        }
                        if (!selectedColumns.includes("title")) {
                            row.querySelector(".title").style.display = "none";
                        } else {
                            row.querySelector(".title").style.display = "inline-block";
                        }
                        if (!selectedColumns.includes("status")) {
                            row.querySelector(".status").style.display = "none";
                        } else {
                            row.querySelector(".status").style.display = "inline-block";
                        }
                        if (!selectedColumns.includes("date_applied")) {
                            row.querySelector(".date_applied").style.display = "none";
                        } else {
                            row.querySelector(".date_applied").style.display = "inline-block";
                        }
                        if (!selectedColumns.includes("notes")) {
                            row.querySelector(".notes").style.display = "none";
                        } else {
                            row.querySelector(".notes").style.display = "inline-block";
                        }
                    });
                    
                    // Close the filter modal
                    filterModal.style.display = "none";
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => console.error("Error:", error));
        });
    }
    
    // Handle reset filter button click
    if (resetButton) {
        resetButton.addEventListener("click", () => {
            // Reset the form fields to their default values
            filterForm.reset();
            
            // Re-fetch all jobs by sending an empty filter request
            fetch('/advanced_filter', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: [],
                    date_from: "",
                    date_to: ""
                })
            })
            .then(response => response.json())
            .then(data => {
                tableContent.innerHTML = ''; // Clear current table rows
                if (data.success) {
                    if (data.results.length > 0) {
                        data.results.forEach(job => {
                            const newRow = document.createElement("div");
                            newRow.classList.add("table-row");
                            newRow.dataset.id = job.id;
                            newRow.innerHTML = `
                                <input type="checkbox">
                                <span class="company_name">${job.company_name}</span>
                                <span class="job-title">${job.title}</span>
                                <span class="status">${job.status}</span>
                                <span class="date_applied">${job.date_applied}</span>
                                <span class="notes">${job.notes}</span>
                            `;
                            tableContent.appendChild(newRow);
                        });
                    } else {
                        const noResultRow = document.createElement("div");
                        noResultRow.classList.add("table-row");
                        noResultRow.innerHTML = '<span colspan="5">No result found</span>';
                        tableContent.appendChild(noResultRow);
                    }
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => console.error("Error:", error));
        });
    }
    

});
