# StudyFlow

### Multi-Tenant Study Planner SaaS

StudyFlow is a modern study planning and academic management web application designed to help students organize their courses, assignments, exams, study sessions, notes, and academic progress in one place.

The application is designed as a **multi-tenant SaaS**, where each student or study group has an isolated workspace and its data is protected from other tenants.

## Features

* User authentication and account management
* Student profile management
* Individual student and study-group workspaces
* Course management
* Assignment tracking
* Exam scheduling
* Study session tracking
* Notes management
* Academic progress tracking
* Dashboard with study statistics
* Upcoming exams and tasks
* Weekly study-hours overview
* Course progress visualization
* Tenant-based data isolation
* Role-based access for owners and members
* Responsive user interface

## Technology Stack

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS

### Backend

* Amazon Cognito
* Amazon API Gateway
* AWS Lambda
* Amazon DynamoDB
* Amazon S3
* Amazon CloudWatch

Optional services can be used for notifications and scheduled reminders.

## SaaS Architecture

StudyFlow follows a serverless, multi-tenant architecture.

Each tenant has its own isolated workspace containing resources such as:

```text
Tenant
├── Courses
├── Assignments
├── Exams
├── Study Sessions
├── Notes
└── Progress
```

Every tenant-owned resource contains a `tenantId`.

The backend verifies the authenticated user's identity and tenant membership before allowing access to tenant data. Tenant isolation is therefore enforced on the backend rather than relying only on frontend filtering.

## Authentication

Authentication is handled through Amazon Cognito.

Supported functionality includes:

* Sign Up
* Login
* Forgot Password
* Password Reset
* Profile Management

User profiles can contain information such as:

* Full Name
* Email
* Profile Picture
* Academic Level
* Institution

## User Roles

### Tenant Owner

Owners can:

* Manage tenant settings
* Manage courses
* Manage assignments
* Manage exams
* Manage study sessions
* Manage notes
* View analytics
* Invite members in study-group workspaces

### Member

Members can:

* View courses
* View assignments
* Create and update their own study tasks
* Create study sessions
* View notes
* View their progress

## Dashboard

The StudyFlow dashboard provides an overview of the student's academic activities.

It includes:

* Total courses
* Pending assignments
* Upcoming exams
* Study hours for the week
* Today's tasks
* Upcoming exams
* Weekly study-hours chart
* Course progress

## Course Management

Users can create, view, update, and delete courses.

A course can contain information such as:

```text
courseId
tenantId
courseName
courseCode
instructor
description
color
targetGrade
progress
createdAt
updatedAt
```

Example:

```text
Data Structures
Course Code: CS-201
Instructor: Dr. Ahmed
Target Grade: A
Progress: 72%
```

## Project Architecture

The application follows a serverless architecture:

```text
React + Vite + TypeScript
          │
          ▼
   Amazon Cognito
   Authentication
          │
          ▼
    API Gateway
       REST API
          │
          ▼
       AWS Lambda
   Backend Business Logic
          │
          ▼
     DynamoDB
   Application Data
          │
          └──────► S3
               File Storage

       CloudWatch
     Logging & Monitoring
```

## Security

A major focus of StudyFlow is tenant isolation.

The application does not blindly trust a `tenantId` provided by the frontend. Backend Lambda functions use the authenticated user's identity and verify their membership before accessing tenant-owned resources.

This helps prevent users from accessing data belonging to another tenant.

## Project Goals

StudyFlow was designed to demonstrate practical implementation of:

* Full-stack web development
* React application architecture
* TypeScript
* Responsive UI/UX
* Serverless AWS architecture
* REST API development
* Authentication with Amazon Cognito
* Lambda-based backend logic
* DynamoDB data management
* Multi-tenant SaaS architecture
* Backend-enforced tenant isolation

## Project Status

🚧 **Development in Progress**

The project is being developed as a practical demonstration of a simple, clean, and understandable multi-tenant serverless SaaS application.

## Getting Started

Clone the repository:

```bash
git clone https://github.com/SadiaIlyas/studyflow.git
```

Move into the project directory:

```bash
cd studyflow
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application can then be opened using the local development URL provided by Vite.

## License

This project is currently intended for educational and development purposes.
