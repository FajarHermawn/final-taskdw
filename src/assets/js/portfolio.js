// portfolio.js
document.addEventListener('DOMContentLoaded', async () => {
    // ... (dark mode script dan fetchAndRender function) ...

    // --- Tech Stack Rendering ---
    const techStackTemplate = (tech) => `
        <div class="picture-section">
            <img src="${tech.logo_path}" alt="${tech.name}" />
            <span>${tech.name}</span>
        </div>
    `;
    await fetchAndRender('/api/tech-stacks', '.tech-stack', techStackTemplate);

    // --- Work Experience Rendering ---
    // Pastikan kontainer HTML Anda di portfolio.hbs memiliki class "work-experience"
    const workExperienceTemplate = (exp) => `
        <div class="bg-gray-200 dark:bg-gray-800 p-4 rounded-lg mb-10">
            <div class="flex gap-8">
                ${exp.company_logo_path ? `<img src="${exp.company_logo_path}" alt="${exp.company} Logo" class="rounded-lg w-15 h-10 ml-2 mt-2" />` : ''}
                <div class="justify-between flex w-full">
                    <div>
                        <h3 class="font-bold text-2xl text-black dark:text-white">${exp.title}</h3>
                        <p class="text-green-500">${exp.company}</p>
                        <ul class="list-disc text-gray-500 dark:text-gray-400 pl-5">
                            ${exp.description_lines.map(line => `<li>${line}</li>`).join('')}
                        </ul>
                    </div>
                    <span class="text-gray-400 dark:text-gray-500 ml-auto">${exp.duration_text}</span>
                </div>
            </div>
        </div>
    `;
    await fetchAndRender('/api/work-experience', '.work-experience', workExperienceTemplate);


    // --- Projects Rendering ---
    // Pastikan kontainer HTML Anda di portfolio.hbs memiliki class "projects"
    const projectTemplate = (project) => `
        <div class="project-card bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
            ${project.image_path ? `<img src="${project.image_path}" alt="${project.title} Image" class="w-full h-48 object-cover rounded-lg mb-4" />` : ''}
            <h2 class="text-2xl font-bold mb-2 text-black dark:text-white">${project.title}</h2>
            <p class="text-gray-700 dark:text-gray-300 mb-4">${project.description}</p>
            <div class="flex flex-wrap gap-2 mt-4 mb-2">
                ${project.tech_stack_array.map(tech => `<p class="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm px-4 py-1">${tech}</p>`).join('')}
            </div>
            <div class="flex gap-6 px-2 mt-4 py-2">
                ${project.repo_link ? `<a href="${project.repo_link}" target="_blank" class="flex items-center text-blue-600 hover:underline">
                    <img src="./svg/github.svg" alt="Repository" class="w-5 h-5 mr-1" />
                    Private Repository
                </a>` : ''}
                ${project.demo_link ? `<a href="${project.demo_link}" target="_blank" class="flex items-center text-blue-600 hover:underline">
                    <img src="./icons/box-arrow-in-up-right.svg" alt="Live Demo" class="w-5 h-5 mr-1 bg-white" />
                    Live Demo
                </a>` : ''}
            </div>
        </div>
    `;
    await fetchAndRender('/api/projects', '.projects', projectTemplate);
});