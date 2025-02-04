document.addEventListener("DOMContentLoaded", () => {
    // Elements for Add Job Modal
    const jobModal = document.getElementById("job_modal");
    const openJobModalBtn = document.getElementById("openModalBtn");
    const closeJobModalBtns = document.querySelectorAll(".close, .close-modal");
    const jobForm = document.getElementById("jobForm");
    const tableContent = document.querySelector(".table-content");

    // Elements for Filter Modal
    const filterModal = document.getElementById("filter_modal");
    const openFilterModalBtn = document.querySelector('.icon-button img[alt="Filter"]').parentElement;
    const closeFilterModalBtn = document.getElementById("filter_close");
    const filterForm = document.getElementById("filterForm");
    const resetFilterBtn = document.querySelector(".reset-filter");

    // Profile Dropdown
    const profileButton = document.getElementById("profile_button");
    const profileSection = document.getElementById("profile_section");

    profileButton.addEventListener("click", (event) => {
        event.stopPropagation();
        profileSection.classList.toggle("show");
    });

    document.addEventListener("click", (event) => {
        if (!profileSection.contains(event.target) && profileSection.classList.contains("show")) {
            profileSection.classList.remove("show");
        }
    });

    // Ensure modals are hidden on load
    jobModal.style.display = "none";
    filterModal.style.display = "none";

    // Function to show modal properly
    function showModal(modal) {
        modal.style.display = "flex";
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        modal.style.justifyContent = "center"; // Ensures centering
        modal.style.alignItems = "center"; // Ensures centering
    }

    // Function to hide modal
    function hideModal(modal) {
        modal.style.display = "none";
        modal.style.visibility = "hidden";
        modal.style.opacity = "0";
    }

    // Open Add Job Modal
    if (openJobModalBtn) {
        openJobModalBtn.addEventListener("click", () => {
            showModal(jobModal);
        });
    }

    // Close Add Job Modal
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

    // Open Filter Modal
    if (openFilterModalBtn) {
        openFilterModalBtn.addEventListener("click", () => {
            showModal(filterModal);
        });
    }

    // Close Filter Modal
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

    // Handle Job Form Submission
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
                    tableContent.prepend(newRow); 

                    // Close modal & reset form
                    hideModal(jobModal);
                    jobForm.reset();
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => console.error("Error:", error));
        });
    }

    // Handle Delete Job
    const deleteJobButton = document.getElementById("delete-button");

    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("checkbox")) {
            const checkBoxes = document.querySelectorAll(".checkbox");
            const anyChecked = [...checkBoxes].some(cb => cb.checked);
            deleteJobButton.classList.toggle("show", anyChecked);
        }
    });

    if (deleteJobButton) {
        deleteJobButton.addEventListener("click", () => {
            const checkedRows = document.querySelectorAll(".checkbox:checked");
            if (checkedRows.length === 0) return;
            if (!confirm("Are you sure you want to delete the selected jobs?")) return;

            const jobIds = [...checkedRows].map(cb => cb.closest(".table-row").dataset.id);

            fetch("/delete-job", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_ids: jobIds })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    checkedRows.forEach(cb => cb.closest(".table-row").remove());
                    deleteJobButton.classList.remove("show");
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => console.error("Error:", error));
        });
    }

    // Handle Reset Filters
    if (resetFilterBtn) {
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
                    if (data.results.length > 0) {
                        data.results.forEach(job => {
                            const newRow = document.createElement("div");
                            newRow.classList.add("table-row");
                            newRow.dataset.id = job.id;
                            newRow.innerHTML = `
                                <input type="checkbox" class="checkbox">
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
