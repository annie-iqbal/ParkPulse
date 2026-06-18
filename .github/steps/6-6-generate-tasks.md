# Step 6-6: Generate Actionable Tasks

## Goal
Use SpecKit to break down the implementation plan into granular, actionable tasks that can be completed step-by-step. This creates a clear roadmap for implementation.

## Using Latest Version of Claude Sonnet

For optimal performance during development, you can configure GitHub Copilot to use the latest version of the Claude Sonnet model:

1. In GitHub Copilot chat, click the **Model selector** dropdown (usually showing the current model)
2. Select the latest version of **Claude Sonnet** from the available models
3. This model provides superior reasoning and code generation capabilities, ideal for spec-driven development workflows

You can switch back to the default model at any time using the same dropdown.

## Instructions

### :keyboard: Activity: Generate tasks using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select the latest version of **Claude Sonnet** from the **Model selector** dropdown for optimal performance.
3. Start a **new chat** to ensure clean context for this step.
4. In the Copilot chat input field, use the SpecKit tasks command:
   ```
   /speckit.tasks
   ```
4. SpecKit will analyze the plan and generate a detailed task list that includes:
   - Specific code changes needed
   - Test additions
   - Documentation updates
   - Configuration modifications
   - Each task should be atomic (one clear objective) and testable
5. Review the generated tasks to ensure they follow a logical sequence and cover all aspects (code, tests, docs).
6. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Generate implementation tasks for overdue todo items"
   git push
   ```

#### Success Criteria
To complete this exercise successfully, ensure that:
- The file `specs/001-*/tasks.md` exists with the complete task list
- Tasks are specific and actionable
- Tasks follow a logical order with dependencies considered
- The task list includes testing and documentation tasks

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- Verify you started a new chat for this step
- Check that the `/speckit.tasks` command was recognized
- Review that `specs/001-*/tasks.md` was created
- Ask Copilot to regenerate the tasks if needed

## Why?
Breaking down the implementation plan into specific tasks ensures that the implementation phase is well-structured and predictable. Each task should be small enough to be completed independently but contribute to the overall feature. Having a clear task list makes it easier to:
- Track progress during implementation
- Verify that all aspects (code, tests, documentation) are covered
- Provide clear requirements to the AI during implementation
