document.addEventListener("DOMContentLoaded", () =>{
    const modal = document.getElementById("job_modal");
    const openModalBtn = document.getElementById("openModalBtn");
    const closeModalBtn = document.querySelectorAll(".close, .close-modal");

    if(openModalBtn){
        openModalBtn.addEventListener("click", () =>{
            modal.style.display = "block";
        });
    }

    if(closeModalBtn){
        closeModalBtn.forEach(btn => {
            btn.addEventListener("click", () =>{
                modal.style.display = "none";
            });
        });
    }

    window.addEventListener("click", even => {
        if(event.target === modal){
            modal.style.display = "none";
        }
    });
});