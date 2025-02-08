import { fetchJSON, renderProjects, updateProjectCount } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Fetch projects data
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

// Define the arc generator for the pie chart
const arcGenerator = d3.arc()
  .innerRadius(0)  
  .outerRadius(50);

// Global state variables for filtering
let selectedIndex = -1;  // no slice is selected
let query = "";         

// Function to render the pie chart and legend
function renderPieChart(projectsData) {
  // Group the projects by year using rollups
  const rolledData = d3.rollups(
    projectsData,
    v => v.length,
    d => d.year
  );
  
  // Convert the rolled data into an array of objects: { label: year, value: count }
  const pieData = rolledData.map(([year, count]) => ({ label: year, value: count }));

  // Use d3.pie() to compute the angles for each slice.
  const pieGenerator = d3.pie().value(d => d.value);
  const pieArcs = pieGenerator(pieData);

  // Clear any previous paths from the SVG.
  svg.selectAll('path').remove();

  // Use an ordinal color scale from D3.
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // Append a path element for each pie slice.
  pieArcs.forEach((d, idx) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(idx))
      .attr('class', idx === selectedIndex ? 'selected' : '')
      .style('cursor', 'pointer')
      .on('click', () => {
        // Toggle selection: if the same slice is clicked, deselect; otherwise, select this one.
        selectedIndex = selectedIndex === idx ? -1 : idx;
        renderPieChart(projectsData);
        if (selectedIndex === -1) {
          renderProjects(projects, projectsContainer, 'h2');
          updateProjectCount(projects);
        } else {
          const selectedYear = pieData[selectedIndex].label;
          const filteredProjects = projects.filter(p => p.year === selectedYear);
          renderProjects(filteredProjects, projectsContainer, 'h2');
          updateProjectCount(filteredProjects);
        }
      });
  });

  //update the legend.
  legend.selectAll('li').remove();
  pieData.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color: ${colors(idx)}`)
      .attr('class', idx === selectedIndex ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .style('cursor', 'pointer')
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        renderPieChart(projectsData);
        if (selectedIndex === -1) {
          renderProjects(projects, projectsContainer, 'h2');
          updateProjectCount(projects);
        } else {
          const selectedYear = pieData[selectedIndex].label;
          const filteredProjects = projects.filter(p => p.year === selectedYear);
          renderProjects(filteredProjects, projectsContainer, 'h2');
          updateProjectCount(filteredProjects);
        }
      });
  });
}

// Render everything
renderProjects(projects, projectsContainer, 'h2');
updateProjectCount(projects);
renderPieChart(projects);

// search functionality so that the pie chart and project list update when a search is made.
const searchInput = document.querySelector('.searchBar');
if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    query = event.target.value;
    // Filter the projects using a lower-case search across all project properties.
    const filteredProjects = projects.filter(project => {
      const allValues = Object.values(project).join('\n').toLowerCase();
      return allValues.includes(query.toLowerCase());
    });
    // Reset any selected pie slice when searching.
    selectedIndex = -1;
    renderProjects(filteredProjects, projectsContainer, 'h2');
    updateProjectCount(filteredProjects);
    renderPieChart(filteredProjects);
  });
}
