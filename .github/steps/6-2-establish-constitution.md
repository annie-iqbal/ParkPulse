# Step 6-2: Establish Project Constitution

## Goal
Create a project constitution that defines governing principles and development guidelines. This ensures all AI-generated code follows your team's standards, coding conventions, and quality principles.

## Using Latest Version of Claude Sonnet

For optimal performance during development, you can configure GitHub Copilot to use the latest version of the Claude Sonnet model:

1. In GitHub Copilot chat, click the **Model selector** dropdown (usually showing the current model)
2. Select the latest version of **Claude Sonnet** from the available models
3. This model provides superior reasoning and code generation capabilities, ideal for spec-driven development workflows

You can switch back to the default model at any time using the same dropdown.

## Instructions

### :keyboard: Activity: Use SpecKit to create the project constitution

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select the latest version of **Claude Sonnet** from the **Model selector** dropdown for optimal performance.
3. Start a **new chat** to ensure clean context.
4. In the Copilot chat input field, use the SpecKit slash command to create your constitution:
   ```
   /speckit.constitution create principles based on existing guidelines in the docs folder
   ```
5. Review the generated constitution in `.specify/memory/constitution.md` to ensure it reflects your project's actual practices.
6. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Establish project constitution with SpecKit"
   git push origin feature/speckit
   ```

#### Success Criteria
To complete this exercise successfully, ensure that:
- The file `.specify/memory/constitution.md` has been updated with project-specific principles
- The constitution contains actual principles (not placeholder names like "PRINCIPLE_1_NAME")
- The constitution references your existing documentation (coding-guidelines.md, testing-guidelines.md, ui-guidelines.md, functional-requirements.md)
- Changes are committed and pushed to the `feature/speckit` branch

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- Verify that the docs folder contains your project guidelines
- Check that `.specify/memory/constitution.md` was updated with real content
- Ask Copilot to regenerate the constitution if it contains placeholder text

## Why?
The constitution serves as the foundation for all spec-driven development in your project. It ensures consistency across all AI-generated specifications, plans, and implementations. By establishing clear principles upfront, you guide the AI to produce code that aligns with your team's standards, architectural decisions, testing requirements, and UI/UX guidelines. This reduces rework and maintains code quality throughout the development lifecycle.
