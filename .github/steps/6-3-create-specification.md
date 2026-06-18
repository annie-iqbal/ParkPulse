# Step 6-3: Create Your First Specification

## Goal
Use SpecKit to create a detailed specification for adding overdue task indicators to the todo application. This is where you define **what** you want to build before thinking about **how** to build it.

## Using Latest Version of Claude Sonnet

For optimal performance during development, you can configure GitHub Copilot to use the latest version of the Claude Sonnet model:

1. In GitHub Copilot chat, click the **Model selector** dropdown (usually showing the current model)
2. Select the latest version of **Claude Sonnet** from the available models
3. This model provides superior reasoning and code generation capabilities, ideal for spec-driven development workflows

You can switch back to the default model at any time using the same dropdown.

## Instructions

### :keyboard: Activity: Create a specification using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select the latest version of **Claude Sonnet** from the **Model selector** dropdown for optimal performance.
3. Start a **new chat** to ensure clean context for this feature.
4. In the Copilot chat input field, use the SpecKit slash command:
   ```
   /speckit.specify
   ```
4. When prompted, provide the following user story:
   ```markdown
   # Support for Overdue Todo Items

   ## User Story

   **As a** todo application user  
   **I want to** easily identify and distinguish overdue tasks in my todo list  
   **So that** I can prioritize my work and quickly see which tasks are past their due date

   ## Description

   Users need a clear, visual way to identify which todos have not been completed by their due date. This helps users quickly spot overdue items without having to manually check dates against today's date.
   ```
5. SpecKit will create a new feature branch and generate a detailed specification document.
6. Review the generated spec to ensure it captures the requirements correctly. Don't worry if some details seem unclear - we'll clarify and refine the specification in the next step.
7. Commit and push your changes - take note that you are on a new branch that speckit created

#### Success Criteria
To complete this exercise successfully, ensure that:
- A new Git branch matching the pattern `001-*` was created (e.g., `001-overdue-todos`)
- The file `specs/001-*/spec.md` exists with the detailed specification
- The specification includes the user story, requirements, and acceptance criteria

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- Verify you started a new chat for this feature
- Check that the `/speckit.specify` command was recognized
- Review the created branch name (it should start with `001-`)
- Ask Copilot to regenerate the specification if needed

## Why?
Creating a specification before implementation is the foundation of Spec-Driven Development. The spec documents **what** needs to be built and **why**, without getting into implementation details. This gives the AI clear requirements to work from and creates a reference point for all subsequent steps (clarification, planning, tasks, and implementation). A good specification reduces ambiguity and ensures everyone understands the feature before any code is written.
