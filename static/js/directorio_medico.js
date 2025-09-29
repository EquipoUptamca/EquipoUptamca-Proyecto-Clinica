document.addEventListener('DOMContentLoaded', () => {
    const accordionContainer = document.getElementById('directoryAccordion');
    const loader = document.getElementById('directory-loader');
    const searchInput = document.getElementById('searchDirectory');
    const noResults = document.getElementById('no-results');
    let directoryData = {};

    const fetchDirectory = async () => {
        try {
            const response = await fetch('/api/medicos/directorio');
            if (!response.ok) {
                throw new Error('Error al cargar el directorio');
            }
            directoryData = await response.json();
            renderDirectory(directoryData);
        } catch (error) {
            console.error(error);
            accordionContainer.innerHTML = `<div class="alert alert-danger">No se pudo cargar el directorio médico.</div>`;
        } finally {
            loader.style.display = 'none';
        }
    };

    const renderDirectory = (data) => {
        accordionContainer.innerHTML = '';
        const specialties = Object.keys(data).sort();

        if (specialties.length === 0) {
            noResults.style.display = 'block';
            return;
        }
        noResults.style.display = 'none';

        specialties.forEach((specialty, index) => {
            const doctors = data[specialty];
            const accordionId = `collapse-${index}`;
            const headerId = `header-${index}`;

            const doctorsHtml = doctors.map(doc => `
                <div class="doctor-card">
                    <div class="doctor-card-header">
                        <i class="fas fa-user-md"></i>
                        <h5>${doc.nombre_completo}</h5>
                    </div>
                    <div class="doctor-card-body">
                        <p><i class="fas fa-phone-alt"></i> <strong>Teléfono:</strong> ${doc.telefono}</p>
                        <p><i class="fas fa-envelope"></i> <strong>Correo:</strong> ${doc.correo}</p>
                    </div>
                </div>
            `).join('');

            const accordionItem = `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="${headerId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${accordionId}">
                            ${specialty} <span class="badge bg-success ms-2">${doctors.length}</span>
                        </button>
                    </h2>
                    <div id="${accordionId}" class="accordion-collapse collapse" data-bs-parent="#directoryAccordion">
                        <div class="accordion-body">
                            ${doctorsHtml}
                        </div>
                    </div>
                </div>
            `;
            accordionContainer.innerHTML += accordionItem;
        });
    };

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = {};

        for (const specialty in directoryData) {
            if (specialty.toLowerCase().includes(searchTerm)) {
                filteredData[specialty] = directoryData[specialty];
            } else {
                const matchingDoctors = directoryData[specialty].filter(doc => doc.nombre_completo.toLowerCase().includes(searchTerm));
                if (matchingDoctors.length > 0) {
                    filteredData[specialty] = matchingDoctors;
                }
            }
        }
        renderDirectory(filteredData);
    });

    fetchDirectory();
});