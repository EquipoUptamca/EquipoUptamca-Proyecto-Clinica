document.addEventListener('DOMContentLoaded', () => {

    // --- Redirección de botones ---
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/login';
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            window.location.href = '/register';
        });
    }

    // --- Lógica del Carrusel de Testimonios ---
    const slider = document.getElementById('testimonial-slider');
    if (!slider) return;

    const testimonials = [
        {
            text: "MedAsistencia ha transformado nuestra gestión diaria. La plataforma es intuitiva y nos ha permitido optimizar el tiempo de consulta, enfocándonos más en nuestros pacientes.",
            author: "Dr. José Ramón Nieto",
            role: "Cardiólogo",
            avatar: "/static/img/1670334129861_srE7YZj.png"
        },
        {
            text: "La capacidad de generar reportes y analizar datos en tiempo real es una ventaja competitiva. Nos ayuda a tomar decisiones estratégicas para mejorar la calidad del servicio.",
            author: "Dr. Antonio Guarino",
            role: "Endocrinología",
            avatar: "/static/img/IMG_20221104_105135_091_6i5Z4XS.png"
        },
        {
            text: "Desde que usamos MedAsistencia, la coordinación entre el personal médico ha mejorado notablemente. El acceso centralizado a los historiales es simplemente revolucionario.",
            author: "Dra. Sobeida Mendoza",
            role: "Pediatra",
            avatar: "/static/img/photo_2022-10-31_09-49-44_wRX4Ib7.jpg"
        }
    ];

    // Cargar testimonios en el slider
    slider.innerHTML = testimonials.map(t => `
        <div class="testimonial-card">
            <img src="${t.avatar}" alt="Avatar de ${t.author}" class="testimonial-avatar" onerror="this.style.display='none'">
            <p class="testimonial-text">"${t.text}"</p>
            <p class="testimonial-author">${t.author}</p>
            <p class="testimonial-role">${t.role}</p>
        </div>
    `).join('');

    const prevBtn = document.querySelector('.slider-btn.prev');
    const nextBtn = document.querySelector('.slider-btn.next');
    let currentIndex = 0;

    function updateSlider() {
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % testimonials.length;
        updateSlider();
    });

    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
        updateSlider();
    });

    // Auto-play (opcional)
    setInterval(() => {
        nextBtn.click();
    }, 7000); // Cambia de testimonio cada 7 segundos

});