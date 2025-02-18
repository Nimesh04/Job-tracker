document.addEventListener("DOMContentLoaded", () => {
    // Elements for Add Job Modal
    const jobModal = document.getElementById("job_modal");
    const openJobModalBtn = document.getElementById("openModalBtn");
    const closeJobModalBtns = document.querySelectorAll(".close, .close-modal");
    const jobForm = document.getElementById("jobForm");
    const tableContent = document.querySelector(".table-content");

    //Element for delete job modal
    const deleteJob = document.getElementById("delete-button");
    const deletePopup = document.getElementById("deleteJobPopUp");
    const confirmDeleteBtn = document.getElementById("confirmDelete");
    const cancelDeleteBtn = document.getElementById("cancelDelete");

    console.log("DeletePopup is" + deletePopup);

    // Elements for Filter Modal
    const filterModal = document.getElementById("filter_modal");
    const columnToDisplay = document.getElementById("columns-to-display");
    const openFilterModalBtn = document.querySelector('.icon-button img[alt="Filter"]').parentElement;
    const closeFilterModalBtn = document.getElementById("filter_close");
    const filterForm = document.getElementById("filterForm");
    const applyFilterBtn = document.querySelector(".apply-filter");
    const resetFilterBtn = document.querySelector(".reset-filter");

    // Profile Dropdown
    const profileButton = document.getElementById("profile_button");
    const profileSection = document.getElementById("profile_section");

    const loginForm = document.querySelector("form[action*='login']");
    const signupForm = document.querySelector("form[action*='register_users']");
    
    // Delete account
    const deleteAccountBtn = document.querySelector(".delete-account-btn");
    const deleteAccountPopup = document.getElementById("deleteAccountPopup");
    const confirmDeleteAccountBtn = document.getElementById("confirmDeleteAccount");
    const cancelDeleteAccountBtn = document.getElementById("cancelDeleteAccount");

    //Search element
    const searchBar = document.querySelector(".search-bar");
    const searchButton = document.querySelector(".search-btn");


    const cancelSearchButton = document.createElement("button");
    cancelSearchButton.innerHTML = "&times;"; // Use "×" symbol
    cancelSearchButton.classList.add("cancel-search-btn");
    cancelSearchButton.style.display = "none"; // Hide by default

    // Style to remove background and border
    cancelSearchButton.style.background = "none";
    cancelSearchButton.style.border = "none";
    cancelSearchButton.style.fontSize = "24px";
    cancelSearchButton.style.cursor = "pointer";
    cancelSearchButton.style.marginLeft = "10px"; // Add spacing
    cancelSearchButton.style.color = "#555"; // Optional: Adjust color for visibility

    searchBar.insertAdjacentElement("afterend", cancelSearchButton);

    function performSearch() {
        const query = searchBar.value.trim();

        if (!query) {
            alert("Please enter a search term.");
            return;
        }

        fetch("/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query }),
        })
        .then(response => response.json())
        .then(data => {
            tableContent.innerHTML = ""; // Clear existing table content

            if (data.success) {
                if (data.results.length > 0) {
                    data.results.forEach(job => {
                        const newRow = document.createElement("div");
                        newRow.classList.add("table-row");
                        newRow.dataset.id = job.id;
                        newRow.innerHTML = `
                            <input type="checkbox" class="checkbox">
                            <span>${job.company_name}</span>
                            <span>${job.title} <a href="${job.link}" target="_blank">🔗</a></span>
                            <span>${job.status}</span>
                            <span>${job.date_applied}</span>
                            <span>${job.notes}</span>
                        `;
                        tableContent.appendChild(newRow);
                    });
                } else {
                    const noResultRow = document.createElement("div");
                    noResultRow.classList.add("table-row");
                    noResultRow.innerHTML = `<span colspan="5">No results found.</span>`;
                    tableContent.appendChild(noResultRow);
                }
            } else {
                alert("Error: " + data.message);
            }

            cancelSearchButton.style.display = "inline-block"; // Show the cancel button
        })
        .catch(error => console.error("Search Error:", error));
    }

    function cancelSearch() {
        searchBar.value = ""; // Clear search input
        window.location.reload(); // Reload the page to show all job applications
    }

    // Attach event listeners to trigger search
    if (searchButton) {
        searchButton.addEventListener("click", performSearch);
    }
    
    if (searchBar) {
        searchBar.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                performSearch();
            }
        });
    }

    // Attach event listener to cancel search button
    cancelSearchButton.addEventListener("click", cancelSearch);


    profileButton.addEventListener("click", (event) => {
        event.stopPropagation();
        profileSection.classList.toggle("show");
    });

    document.addEventListener("click", (event) => {
        if (!profileSection.contains(event.target) && profileSection.classList.contains("show")) {
            profileSection.classList.remove("show");
        }
    });

    setTimeout(() => {
        document.querySelectorAll(".flash-messages li").forEach(msg => {
            msg.style.animation = "fadeOut 1s forwards";
            setTimeout(() => msg.remove(), 1000);
        });
    }, 3000);

    // Ensure modals are hidden on load
    jobModal.style.display = "none";
    filterModal.style.display = "none";

    function showModal(modal) {
        modal.style.display = "flex";
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        modal.style.justifyContent = "center";
        modal.style.alignItems = "center";
    }

    function hideModal(modal) {
        modal.style.display = "none";
        modal.style.visibility = "hidden";
        modal.style.opacity = "0";
    }

    function updateJobStatus(jobId, newStatus, dropdown) {
        console.log("Updating job ID:", jobId, "to status:", newStatus); 
        fetch("/update_job_status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: jobId, new_status: newStatus })
        })
        .then(response => response.json())
        .then(data => {
            if(!data.success){
                alert("Error updating status: "+ data.message);
                dropdown.value = dropdown. dataset.previousValue;
            } else {
                dropdown.dataset.previousValue = newStatus;
            }
        })
        .catch(error => {
            console.error("Error: ", error);
            alert("Failed to update status. Try again.");
            dropdown.value =  dropdown.dataset.previousValue; 
        });
    }

    function showError(input, message) {
        let errorElement = input.nextElementSibling;
        if (!errorElement || !errorElement.classList.contains("error-message")) {
            errorElement = document.createElement("div");
            errorElement.classList.add("error-message");
            errorElement.style.color = "red";
            errorElement.style.marginTop = "5px";
            input.parentNode.insertBefore(errorElement, input.nextSibling);
        }
        errorElement.innerText = message;
    }

    function clearErrors(form) {
        form.querySelectorAll(".error-message").forEach(error => error.remove());
    }


    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", (event) => {
            event.preventDefault();
            deleteAccountPopup.style.display = "flex"; // Show the confirmation popup
        });
    }

    // Handle Confirm Delete Account
    confirmDeleteAccountBtn.addEventListener("click", () => {
        fetch("/delete_account", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Your account has been deleted. You will be redirected.");
                window.location.href = data.redirect; // Redirect to sign-up page
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => console.error("Error:", error));
    });

    // Handle Cancel Delete Account
    cancelDeleteAccountBtn.addEventListener("click", () => {
        deleteAccountPopup.style.display = "none"; // Close popup
    });

    tableContent.addEventListener("change", (event) => {
        if(event.target.classList.contains("status-dropdown")) {
            const dropdown = event.target;
            const jobRow = dropdown.closest(".table-row");
            const jobId = jobRow ? jobRow.dataset.id : null;
            const newStatus = dropdown.value;
            
            if(!jobId){
                alert("Error: Job ID not found.");
                return;
            }
            updateJobStatus(jobId, newStatus, dropdown);
        }
    });


    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            clearErrors(loginForm);
            const username = document.getElementById("username");
            const password = document.getElementById("password");
            let isValid = true;

            if (username.value.trim() === "") {
                showError(username, "Username is required.");
                isValid = false;
            }
            if (password.value.trim() === "") {
                showError(password, "Password is required.");
                isValid = false;
            }

            if (isValid) loginForm.submit();
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", (event) => {
            event.preventDefault();
            clearErrors(signupForm);
            const username = document.getElementById("signup-username");
            const email = document.getElementById("signup-email");
            const password = document.getElementById("signup-password");
            const confirmPassword = document.getElementById("signup-confirm-password");
            let isValid = true;

            if (username.value.trim() === "") {
                showError(username, "Username is required.");
                isValid = false;
            }
            if (email.value.trim() === "" || !email.value.includes("@")) {
                showError(email, "Enter a valid email address.");
                isValid = false;
            }
            if (password.value.length < 6) {
                showError(password, "Password must be at least 6 characters.");
                isValid = false;
            }
            if (password.value !== confirmPassword.value) {
                showError(confirmPassword, "Passwords do not match.");
                isValid = false;
            }

            if (isValid) signupForm.submit();
        });
    }

    
    if (openJobModalBtn) {
        openJobModalBtn.addEventListener("click", () => {
            showModal(jobModal);
        });
    }

    closeJobModalBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            hideModal(jobModal);
        });
    });

    window.addEventListener("click", (event) => {
        if (event.target === jobModal) {
            hideModal(jobModal);
        }
    });

    if (openFilterModalBtn) {
        openFilterModalBtn.addEventListener("click", () => {
            showModal(filterModal);
            hideModal(columnToDisplay);

        });
    }

    if (closeFilterModalBtn) {
        closeFilterModalBtn.addEventListener("click", () => {
            hideModal(filterModal);
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target === filterModal) {
            hideModal(filterModal);
        }
    });

    if (jobForm) {
        jobForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const formData = new FormData(jobForm);
            const jobData = {
                company: formData.get("company"),
                title: formData.get("title"),
                link: formData.get("link"),
                status: formData.get("status"),
                date_applied: formData.get("date_applied"),
                notes: formData.get("notes")
            };

            fetch("/add_job", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(jobData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) { 
                    const newRow = document.createElement("div");
                    newRow.classList.add("table-row");
                    newRow.innerHTML = `
                        <input type="checkbox" class="checkbox">
                        <span>${jobData.company}</span>
                        <span>${jobData.title} <a href="${jobData.link}" target="_blank">[-]</a></span>
                        <select class="status-dropdown" data-previous-value="${jobData.status}">
                            <option value="Applied" ${jobData.status === 'Applied' ? 'selected="selected"' : ''}>Applied</option>
                            <option value="Interview" ${jobData.status === 'Interview' ? 'selected' : ''}>Interview</option>
                            <option value="Offer" ${jobData.status === 'Offer' ? 'selected' : ''}>Offer</option>
                            <option value="Rejected" ${jobData.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                        <span>${jobData.date_applied}</span>
                        <span>${jobData.notes}</span>
                    `;
                    tableContent.prepend(newRow);
                    hideModal(jobModal);
                    jobForm.reset();
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => console.error("Error:", error));
        });
    }


    //delete jobs
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

    let selectedJobIds = []; // Store job IDs to delete

    deleteJob.addEventListener("click", () => {
        const checkedRows = document.querySelectorAll(".checkbox:checked");
        if (checkedRows.length === 0) return;

        selectedJobIds = [...checkedRows].map(cb => cb.closest(".table-row").dataset.id);

        if (selectedJobIds.length > 0) {
            deletePopup.style.display = "flex"; // Show popup
        }
    });

    // Handle Confirm Delete
    confirmDeleteBtn.addEventListener("click", () => {
        if (selectedJobIds.length === 0) return;

        fetch("/delete-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_ids: selectedJobIds }) // Send array of IDs
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                selectedJobIds.forEach(jobId => {
                    const row = document.querySelector(`.table-row[data-id='${jobId}']`);
                    if (row) row.remove();
                });

                deleteJob.classList.remove("show"); // Hide delete button
                deletePopup.style.display = "none"; // Close popup
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => console.error("Error:", error));
    });

    // Handle Cancel Delete
    cancelDeleteBtn.addEventListener("click", () => {
        deletePopup.style.display = "none"; // Close popup
        selectedJobIds = []; // Clear selection
    });


    applyFilterBtn.addEventListener("click", (event) => {
        event.preventDefault();
        
        const selectedColumns = [...document.querySelectorAll("input[name='columns']:checked")].map(checkbox => checkbox.value);
        const selectedStatuses = [...document.querySelectorAll("input[name='status']:checked")].map(checkbox => checkbox.value);
        const dateFrom = document.getElementById("filter_date_from").value;
        const dateTo = document.getElementById("filter_date_to").value;

        fetch("/advanced_filter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: selectedStatuses,
                date_from: dateFrom,
                date_to: dateTo
            })
        })
        .then(response => response.json())
        .then(data => {
            tableContent.innerHTML = "";
            if (data.success) {
                if (data.results.length > 0) {
                    data.results.forEach(job => {
                        const newRow = document.createElement("div");
                        newRow.classList.add("table-row");
                        newRow.dataset.id = job.id;

                        let rowContent = `<input type="checkbox" class="checkbox">`;
                        if (selectedColumns.includes("company_name")) rowContent += `<span>${job.company_name}</span>`;
                        if (selectedColumns.includes("title")) rowContent += `<span>${job.title}</span>`;
                        if (selectedColumns.includes("status")) rowContent += `<span>${job.status}</span>`;
                        if (selectedColumns.includes("date_applied")) rowContent += `<span>${job.date_applied}</span>`;
                        if (selectedColumns.includes("notes")) rowContent += `<span>${job.notes}</span>`;

                        newRow.innerHTML = rowContent;
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

        hideModal(filterModal);
    });

    // Reset Filter Functionality
    resetFilterBtn.addEventListener("click", () => {
        filterForm.reset();
        fetch("/advanced_filter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: [],
                date_from: "",
                date_to: ""
            })
        })
        .then(response => response.json())
        .then(data => {
            tableContent.innerHTML = "";
            if (data.success) {
                data.results.forEach(job => {
                    const newRow = document.createElement("div");
                    newRow.classList.add("table-row");
                    newRow.dataset.id = job.id;
                    newRow.innerHTML = `
                        <input type="checkbox" class="checkbox">
                        <span>${job.company_name}</span>
                        <span>${job.title}</span>
                        <span>${job.status}</span>
                        <span>${job.date_applied}</span>
                        <span>${job.notes}</span>
                    `;
                    tableContent.appendChild(newRow);
                });
            }
        })
        .catch(error => console.error("Error:", error));

        hideModal(filterModal);
    });

});
