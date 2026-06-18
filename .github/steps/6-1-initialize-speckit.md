# Step 6-1: Initialize SpecKit in Your Project

## Overview
Welcome to Session 6! In this lesson, we're building on top of the foundation you created in Session 2. You already have a working todo application with context documents that guide Copilot. Now, we'll use **SpecKit** to add new functionality to the application using Spec-Driven Development - a structured approach that focuses on specifications, plans, and tasks before implementation.

Before we begin with SpecKit, let's verify that your todo application is working correctly.

## Goal
Initialize SpecKit in your project to enable Spec-Driven Development with structured workflows and slash commands for your AI coding assistant.

## Using Latest Version of Claude Sonnet

For optimal performance during development, you can configure GitHub Copilot to use the latest version of the Claude Sonnet model:

1. In GitHub Copilot chat, click the **Model selector** dropdown (usually showing the current model)
2. Select the latest version of **Claude Sonnet** from the available models
3. This model provides superior reasoning and code generation capabilities, ideal for spec-driven development workflows

You can switch back to the default model at any time using the same dropdown.

## Instructions

### :keyboard: Activity: Launch a Codespace for this repository and create a new branch

Click the below button to open the **Create Codespace** page in a new tab. Use the default configuration.

   [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/{{full_repo_name}}?quickstart=1)

:pencil2: Create a new branch called `feature/speckit`. :pencil2:

#### :keyboard: Activity: Verify the application is running

1. Open a **terminal** in your Codespace.
2. Start the application:
   ```bash
   npm start
   ```
3. Verify that both the frontend and backend start successfully and the todo app is accessible.
4. Stop the application (Ctrl+C) once you've confirmed it's working.

#### :keyboard: Activity: Initialize SpecKit

> **Note:** The `uv` package manager should be automatically installed in your Codespace. If for any reason you need to install it manually, follow the instructions at [https://docs.astral.sh/uv/getting-started/installation/](https://docs.astral.sh/uv/getting-started/installation/).

1. Install the SpecKit CLI tool using `uv`:
   ```bash
   uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
   ```
3. Initialize SpecKit in the current project directory:
   ```bash
   specify init --here --force --ai copilot
   ```
4. Verify that the `.specify/` directory was created with the necessary files.
5. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Initialize SpecKit for spec-driven development"
   git push origin feature/speckit
   ```

#### Success Criteria
To complete this exercise successfully, ensure that:
- A new `feature/speckit` branch is pushed
- The `.specify/` directory exists in the project root
- The file `.specify/memory/constitution.md` exists
- The `.specify/` directory contains the SpecKit templates and configuration

If you encounter any issues, you can:
- Double check that the newly pushed branch is called `feature/speckit`
- Verify that `uv` is installed by running `uv --version`
- Review that `.specify/memory/constitution.md` was created
- Check that the specify init command ran successfully without errors

## Why?
Initializing SpecKit sets up your project with the tools and templates needed for Spec-Driven Development. This structured approach helps you build high-quality software by focusing on specifications, plans, and tasks before implementation - rather than "vibe coding" from scratch. The `.specify/` directory contains templates for constitution, specifications, plans, and tasks that guide the development process.
