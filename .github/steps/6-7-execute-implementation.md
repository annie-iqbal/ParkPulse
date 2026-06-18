# Step 6-7: Execute Implementation

## Goal
Use SpecKit to automatically implement all tasks and generate the code to add overdue task indicators to the todo application. This is where the specification becomes reality.

## Using Latest Version of Claude Sonnet

For the implementation phase, you should configure GitHub Copilot to use the latest version of the Claude Sonnet model for superior code quality and reliability:

1. In GitHub Copilot chat, click the **Model selector** dropdown (usually showing the current model)
2. Select the latest version of **Claude Sonnet** from the available models
3. This model is ideal for implementation tasks, providing better code generation, reasoning, and handling of complex requirements

Claude Sonnet provides superior capabilities for the implementation phase.

## Instructions

### :keyboard: Activity: Execute implementation using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select the latest version of **Claude Sonnet** from the **Model selector** dropdown for superior code quality during implementation.
3. Start a **new chat** to ensure clean context for this step.
4. In the Copilot chat input field, use the SpecKit implement command:
   ```
   /speckit.implement
   ```
4. SpecKit will execute each task sequentially and:
   - Generate or modify code files
   - Create tests alongside features
   - Update documentation
   - Follow your project constitution and coding guidelines
   - May create multiple commits as it progresses
5. Monitor the implementation progress as SpecKit works through each task.
6. Once implementation is complete, verify that everything built correctly.

#### :keyboard: Activity: Verify and test the implementation

1. Run the test suite to ensure all tests pass:
   ```bash
   npm test
   ```
2. Start the application to verify the UI works correctly:
   ```bash
   npm start
   ```
3. Test the overdue indicator functionality:
   - Create a todo with a due date in the past
   - Verify that it displays an overdue indicator
   - Check that the styling matches the design guidelines
4. Verify that the code follows your project's coding guidelines
5. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Implement overdue task indicators"
   git push
   ```

#### Success Criteria
To complete this exercise successfully, ensure that:
- All tasks from `specs/001-*/tasks.md` have been implemented
- Code changes are present in the appropriate files
- Tests have been created and are passing: `npm test`
- The application runs without errors: `npm start`
- Overdue indicators are visible in the UI with appropriate styling
- All code follows your project's coding guidelines
- Changes have been committed and pushed to the repository

If you encounter any issues, you can:
- Review the generated code for quality and correctness
- Run `npm test` to check for test failures
- Use `npm start` to verify the application works
- Ask Copilot to fix specific problems or regenerate code
- Check the git log to see what changes were made

## Why?
The implementation phase is where all the careful planning pays off. By following the structured specification → clarification → plan → tasks → implementation flow, you ensure that:
- The AI has clear, unambiguous requirements
- Implementation aligns with your project standards
- Code quality is maintained
- Testing is integrated from the start
- The feature is built exactly as designed

This structured approach reduces rework, maintains consistency, and produces production-ready code in a predictable manner.
