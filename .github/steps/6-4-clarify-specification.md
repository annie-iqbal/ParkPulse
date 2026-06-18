# Step 6-4: Clarify the Specification

## Goal
Use SpecKit to identify and resolve any ambiguous or underspecified areas in the specification before creating the technical plan. This ensures clarity and prevents misunderstandings during implementation.

## Using Latest Version of Claude Sonnet

For optimal performance during development, you can configure GitHub Copilot to use the latest version of the Claude Sonnet model:

1. In GitHub Copilot chat, click the **Model selector** dropdown (usually showing the current model)
2. Select the latest version of **Claude Sonnet** from the available models
3. This model provides superior reasoning and code generation capabilities, ideal for spec-driven development workflows

You can switch back to the default model at any time using the same dropdown.

## Instructions

### :keyboard: Activity: Clarify the specification using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select the latest version of **Claude Sonnet** from the **Model selector** dropdown for optimal performance.
3. Start a **new chat** to ensure clean context for this step.
4. In the Copilot chat input field, use the SpecKit clarify command:
   ```
   /speckit.clarify
   ```
4. SpecKit will analyze the specification and ask clarifying questions about:
   - Visual design details for the overdue indicator
   - Behavioral edge cases (e.g., what happens at midnight?)
   - Interaction patterns
   - Data handling and filtering
5. Answer the clarifying questions with specific decisions and requirements.
6. SpecKit will update the specification with a "Clarifications" section documenting these decisions.
7. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Clarify specification for overdue todo items"
   git push
   ```

#### Success Criteria
To complete this exercise successfully, ensure that:
- The file `specs/001-*/spec.md` has been updated
- The specification now contains a "Clarifications" section
- All ambiguities from the original spec have been addressed
- Additional requirements or constraints are documented

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- Verify you're continuing in the same chat (not starting a new one)
- Check that `/speckit.clarify` command was recognized
- Review that the spec file now contains the "Clarifications" section
- Ask Copilot to regenerate clarifications if needed

## Why?
The clarify step is crucial for reducing ambiguity and ensuring alignment before investing time in planning and implementation. By asking clarifying questions early, you capture important design and behavior decisions in writing. This creates a shared understanding and provides reference documentation for the implementation phase. It also prevents the common scenario where different team members have different assumptions about what needs to be built.
