document.addEventListener("DOMContentLoaded", () => {
    // Elements for Add Job Modal
    const jobModal = document.getElementById("job_modal");
    const openJobModalBtn = document.getElementById("openModalBtn");
    const closeJobModalBtns = document.querySelectorAll(".close, .close-modal");
    const jobForm = document.getElementById("jobForm");
    const tableContent = document.querySelector(".table-content");

    //Element for delete job modal
    const deleteJob = document.getElementById("delete-button");

    //elements for search modal
    const searchBar = document.querySelector('.search-bar');
    const searchButton = document.querySelector('.icon-button img[alt="Search"]').parentElement;

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
                        <input type="checkbox">
                        <span>${jobData.company}</span>
                        <span>${jobData.title}</span>
                        <span>${jobData.status}</span>
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

    //Search function
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
