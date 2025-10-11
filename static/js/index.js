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

    // --- Lógica del Carrusel de Testimonios Mejorado ---
    const slider = document.getElementById('testimonial-slider');
    if (slider) {
        initEnhancedSlider();
    }

    // --- Inicializar contadores de estadísticas ---
    initCounters();

    // --- Inicializar animaciones al hacer scroll ---
    initScrollAnimations();

    // --- Inicializar lazy loading ---
    initLazyLoading();

    function initEnhancedSlider() {
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
                <img src="${t.avatar}" alt="Avatar de ${t.author}" class="testimonial-avatar lazy-load" data-src="${t.avatar}" onerror="this.style.display='none'">
                <p class="testimonial-text">"${t.text}"</p>
                <p class="testimonial-author">${t.author}</p>
                <p class="testimonial-role">${t.role}</p>
            </div>
        `).join('');

        // Añadir indicadores de puntos
        const indicatorsContainer = document.getElementById('slider-indicators');
        if (indicatorsContainer) {
            indicatorsContainer.innerHTML = testimonials.map((_, index) => 
                `<button class="indicator ${index === 0 ? 'active' : ''}" 
                        aria-label="Ir al testimonio ${index + 1}"
                        data-index="${index}"></button>`
            ).join('');
        }

        const prevBtn = document.querySelector('.slider-btn.prev');
        const nextBtn = document.querySelector('.slider-btn.next');
        const indicators = document.querySelectorAll('.indicator');
        let currentIndex = 0;
        let autoPlayInterval;

        function updateSlider() {
            slider.style.transform = `translateX(-${currentIndex * 100}%)`;
            
            // Actualizar indicadores
            indicators.forEach((ind, idx) => {
                ind.classList.toggle('active', idx === currentIndex);
            });
        }

        function goToSlide(index) {
            currentIndex = index;
            updateSlider();
            resetAutoPlay();
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % testimonials.length;
            updateSlider();
        }

        function prevSlide() {
            currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
            updateSlider();
        }

        function resetAutoPlay() {
            clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(nextSlide, 7000);
        }

        // Event Listeners
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoPlay();
        });

        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoPlay();
        });

        indicators.forEach(indicator => {
            indicator.addEventListener('click', () => {
                const index = parseInt(indicator.getAttribute('data-index'));
                goToSlide(index);
            });
        });

        // Auto-play
        resetAutoPlay();

        // Pausar auto-play al hacer hover
        slider.parentElement.addEventListener('mouseenter', () => {
            clearInterval(autoPlayInterval);
        });

        slider.parentElement.addEventListener('mouseleave', () => {
            resetAutoPlay();
        });
    }

    function initCounters() {
        const counters = document.querySelectorAll('.stat-number');
        if (counters.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.getAttribute('data-target'));
                    const duration = 2000;
                    const step = target / (duration / 16);
                    let current = 0;
                    
                    const updateCounter = () => {
                        current += step;
                        if (current < target) {
                            counter.textContent = Math.ceil(current);
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = target;
                            if (target === 99) {
                                counter.textContent = target + '%';
                            }
                        }
                    };
                    
                    updateCounter();
                    observer.unobserve(counter);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => observer.observe(counter));
    }

    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observar elementos para animar al hacer scroll
        document.querySelectorAll('.feature-card, .testimonial-card, .stat-item').forEach(el => {
            if (el.style.animationPlayState) {
                el.style.animationPlayState = 'paused';
                observer.observe(el);
            }
        });
    }

    function initLazyLoading() {
        const lazyImages = document.querySelectorAll('.lazy-load');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // Debounce function para optimizar eventos
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Ejemplo de uso de debounce para eventos de scroll
    const handleScroll = debounce(() => {
        // Lógica para eventos de scroll optimizados
    }, 10);

    window.addEventListener('scroll', handleScroll);

});

// Función global para manejar errores de imágenes
window.handleImageError = function(img) {
    img.style.display = 'none';
    console.warn('Error cargando imagen:', img.src);
};

// ... (mantener todo el JavaScript anterior) ...

// Expandir la función initEnhancedSlider con más testimonios
function initEnhancedSlider() {
    const testimonials = [
        {
            text: "MedAsistencia ha transformado nuestra gestión diaria. La plataforma es intuitiva y nos ha permitido optimizar el tiempo de consulta, enfocándonos más en nuestros pacientes.",
            author: "Dr. José Ramón Nieto",
            role: "Cardiólogo - 20 años de experiencia",
            avatar: "/static/img/1670334129861_srE7YZj.png",
            rating: 5
        },
        {
            text: "La capacidad de generar reportes y analizar datos en tiempo real es una ventaja competitiva. Nos ayuda a tomar decisiones estratégicas para mejorar la calidad del servicio.",
            author: "Dr. Antonio Guarino",
            role: "Endocrinólogo - Especialista en diabetes",
            avatar: "/static/img/IMG_20221104_105135_091_6i5Z4XS.png",
            rating: 5
        },
        {
            text: "Desde que usamos MedAsistencia, la coordinación entre el personal médico ha mejorado notablemente. El acceso centralizado a los historiales es simplemente revolucionario.",
            author: "Dra. Sobeida Mendoza",
            role: "Pediatra - Jefa de Pediatría",
            avatar: "/static/img/photo_2022-10-31_09-49-44_wRX4Ib7.jpg",
            rating: 5
        },
        {
            text: "La implementación fue más rápida de lo esperado. En 2 semanas todo el equipo estaba utilizando la plataforma con fluidez. El soporte técnico es excepcional.",
            author: "Dra. Elena Castillo",
            role: "Ginecóloga - Directora de Área",
            avatar: "/static/img/doctora-elena.jpg",
            rating: 5
        },
        {
            text: "Los pacientes han notado la mejora en la organización. Las citas son más puntuales y la comunicación es más eficiente. Una herramienta indispensable.",
            author: "Dr. Roberto Silva",
            role: "Traumatólogo - 15 años en el centro",
            avatar: "/static/img/dr-silva.jpg",
            rating: 5
        },
        {
            text: "La seguridad de los datos era mi principal preocupación. MedAsistencia superó todas mis expectativas con sus protocolos de protección.",
            author: "Lic. María Fernández",
            role: "Administradora del Centro",
            avatar: "/static/img/administradora.jpg",
            rating: 5
        }
    ];

    // Cargar testimonios en el slider con mejor diseño
    slider.innerHTML = testimonials.map(t => `
        <div class="testimonial-card">
            <div class="testimonial-header">
                <img src="${t.avatar}" alt="Avatar de ${t.author}" class="testimonial-avatar lazy-load" data-src="${t.avatar}" onerror="this.style.display='none'">
                <div class="testimonial-rating">
                    ${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}
                </div>
            </div>
            <p class="testimonial-text">"${t.text}"</p>
            <div class="testimonial-author">
                <strong>${t.author}</strong>
                <span>${t.role}</span>
            </div>
        </div>
    `).join('');

    // ... (resto del código del slider se mantiene igual) ...
}

// Nueva función para animar elementos al hacer scroll en la sección trust
function initTrustSectionAnimations() {
    const trustObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                trustObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    // Observar elementos específicos de la sección trust
    document.querySelectorAll('.trust-experience-card, .testimonial-featured, .certification-item, .case-card').forEach(el => {
        if (el.style.animationPlayState) {
            el.style.animationPlayState = 'paused';
            trustObserver.observe(el);
        }
    });
}

// Inicializar en DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... (código anterior) ...
    
    // Inicializar animaciones de la sección trust
    initTrustSectionAnimations();
});