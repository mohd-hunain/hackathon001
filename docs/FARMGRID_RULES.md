We are building one shared full-stack web application called FarmGrid for the official hackathon problem statement:

FarmGrid — Agricultural Resource Coordination Under Scarcity

Domain:
Smart Agriculture & Rural Resilience

Target:
Full-Stack Coordination and Scheduling Web Platform

Time Limit:
16 Hours

IMPORTANT PROJECT OBJECTIVE

FarmGrid is NOT a simple equipment rental marketplace.

FarmGrid must solve an agricultural resource allocation and scheduling problem under scarcity.

The system must coordinate:

* Who needs a resource
* Which resource they need
* Where they need it
* When they need it
* How long they need it
* How urgent the request is
* Whether the requested time conflicts with another farmer
* Whether travel and logistics make the schedule feasible
* Which farmer should receive priority when resources are scarce
* How the schedule should change after a disruption

The system must provide transparent and explainable allocation decisions.

TECH STACK

Frontend:

* React
* Vite
* JavaScript
* Tailwind CSS
* Axios
* React Router DOM

Backend:

* Node.js
* Express.js
* JavaScript

Database:

* MongoDB
* Mongoose

Authentication:

* JWT
* bcryptjs

Do not use TypeScript.

Do not introduce Redux, Zustand, Firebase, Next.js, Supabase, or a different architecture unless absolutely necessary and approved by the team.

USER ROLES

The application has three roles:

FARMER

RESOURCE_OWNER

MASTER

If the existing project already uses ADMIN instead of RESOURCE_OWNER, preserve ADMIN internally to avoid breaking existing code, but display "Resource Owner" in the user interface.

ROLE RESPONSIBILITIES

FARMER

* Create and manage farm information.
* Provide farm geolocation.
* Browse available resources.
* Submit resource requests.
* Specify earliest possible start.
* Specify latest acceptable end.
* Specify required duration.
* Specify crop stage.
* Provide urgency justification.
* View request status.
* View allocation explanation.
* Submit requests while offline.
* Automatically synchronize offline requests when connectivity returns.

RESOURCE_OWNER

* Add and manage agricultural resources.
* Set resource specifications.
* Set operational location.
* Set operating windows.
* Set maintenance status.
* View assigned booking calendar.
* View resource schedules.

MASTER

* View all requests.
* View resource schedules.
* Detect overlapping requests.
* View transparent priority score breakdowns.
* Generate feasible schedules.
* Account for travel and buffer time.
* Allocate scarce resources.
* View and handle disruptions.
* Trigger dynamic reallocation.
* View human-readable explanations for every allocation.

CORE AGRICULTURAL RESOURCE CATEGORIES

The database must support these categories:

* MACHINERY
* IRRIGATION
* STORAGE
* TRANSPORT
* LABOUR
* SERVICE

Example resource types:

Machinery:

* Tractor
* Harvester
* Tiller
* Seeder

Irrigation:

* Portable Pump
* Drip Line
* Sprinkler Set

Storage:

* Temporary Solar Storage
* Cold Storage

Transport:

* Mini Truck
* Trailer
* Grain Cart

Labour:

* Sowing Team
* Weeding Team
* Harvesting Team

Specialized Services:

* Drone Spraying
* Soil Testing
* Grafting

For the 16-hour MVP, use synthetic seed data and demonstrate only a few important resources, such as:

* Tractor
* Harvester
* Mini Truck
* Portable Pump

IMPORTANT DEVELOPMENT RULES

1. Do not create a separate application.
2. Inspect the existing repository before writing code.
3. Integrate into the existing project.
4. Do not rename database fields.
5. Do not rename API endpoints.
6. Do not modify unrelated modules.
7. Do not create duplicate user collections for different roles.
8. Use one User collection with a role field.
9. Priority scores must be calculated only in the backend.
10. The frontend must never submit a final priority score.
11. Priority scoring must be deterministic and explainable.
12. Every allocation decision must include a human-readable explanation.
13. Do not permanently mark an entire resource unavailable because it has one booking.
14. Resource availability depends on requested time windows.
15. The system must prevent double booking.
16. All scheduling decisions must consider existing allocations.
17. All scheduling decisions must consider travel and buffer time where applicable.
18. Do not commit .env files.
19. Use .env.example for environment variable documentation.
20. Do not change package versions unnecessarily.
21. Reuse existing utilities, authentication middleware, Axios configuration, and components.
22. Keep code modular and easy to merge.
23. Avoid editing files owned by another team member.
24. Before committing, test the assigned module.
25. Review git diff before committing.

GIT RULES

Main branch:

main

Feature branches:

feature/farmer-offline

feature/resource-owner

feature/master-scheduler

Each developer must:

1. Pull the latest main branch.
2. Create or switch to their assigned branch.
3. Work only on their assigned module.
4. Test the module.
5. Review git diff.
6. Commit with a clear commit message.
7. Push the feature branch.
8. Create a Pull Request.
9. Resolve merge conflicts before merging.

DATABASE SCHEMA

USER

{
_id: ObjectId,

name: String,
phone: String,
email: String,
password: String,

role:
"FARMER" |
"RESOURCE_OWNER" |
"MASTER",

address: {
village: String,
taluk: String,
district: String
},

createdAt: Date,
updatedAt: Date
}

FARM

{
_id: ObjectId,

farmerId: ObjectId,

name: String,

location: {
latitude: Number,
longitude: Number,
village: String
},

cropType: String,

cropStage:
"SOWING" |
"GROWING" |
"HARVEST_READY" |
"CRITICAL",

createdAt: Date,
updatedAt: Date
}

RESOURCE

{
_id: ObjectId,

ownerId: ObjectId,

name: String,

category:
"MACHINERY" |
"IRRIGATION" |
"STORAGE" |
"TRANSPORT" |
"LABOUR" |
"SERVICE",

type: String,

specifications: String,

location: {
latitude: Number,
longitude: Number,
village: String
},

operatingWindow: {
startTime: String,
endTime: String
},

maintenanceStatus:
"OPERATIONAL" |
"MAINTENANCE" |
"BREAKDOWN",

bufferMinutes: Number,

createdAt: Date,
updatedAt: Date
}

BOOKING REQUEST

{
_id: ObjectId,

farmerId: ObjectId,

farmId: ObjectId,

resourceId: ObjectId,

resourceType: String,

earliestStart: Date,

latestEnd: Date,

requiredDurationMinutes: Number,

cropStage: String,

urgencyJustification: String,

weatherRiskScore: Number,

resourceConstraintScore: Number,

priorityScore: Number,

priorityBreakdown: {
urgencyDeadline: Number,
weatherRisk: Number,
cropReadiness: Number,
queueWaiting: Number,
distanceLogistics: Number,
resourceConstraints: Number
},

status:
"PENDING" |
"UNDER_REVIEW" |
"SCHEDULED" |
"ALLOCATED" |
"REJECTED" |
"DISRUPTED" |
"CANCELLED" |
"COMPLETED",

allocatedStart: Date,

allocatedEnd: Date,

explanation: String,

syncStatus:
"SYNCED" |
"PENDING_OFFLINE",

createdAt: Date,
updatedAt: Date
}

SCHEDULE

{
_id: ObjectId,

resourceId: ObjectId,

requestId: ObjectId,

farmerId: ObjectId,

startTime: Date,

endTime: Date,

travelBufferBeforeMinutes: Number,

travelBufferAfterMinutes: Number,

status:
"SCHEDULED" |
"ACTIVE" |
"DISRUPTED" |
"COMPLETED",

createdAt: Date,
updatedAt: Date
}

DISRUPTION

{
_id: ObjectId,

resourceId: ObjectId,

type:
"BREAKDOWN" |
"WEATHER_ALERT" |
"DELAY" |
"CANCELLATION",

startTime: Date,

estimatedEndTime: Date,

description: String,

affectedScheduleIds: [ObjectId],

status:
"ACTIVE" |
"RESOLVED",

createdAt: Date
}

OFFICIAL PRIORITY ALLOCATION SYSTEM

Priority score must be deterministic, transparent, and out of 100.

Use the official benchmark factors:

Urgency / Deadline Proximity:
Maximum 25 points

Weather Risk Exposure:
Maximum 25 points

Crop Readiness / Biological Stage:
Maximum 20 points

Queue Waiting Time:
Maximum 15 points

Distance and Logistics Overhead:
Maximum 10 points

Resource Constraints:
Maximum 5 points

TOTAL:
100 points

The backend must return both:

priorityScore

and:

priorityBreakdown

Example:

{
priorityScore: 83,

priorityBreakdown: {
urgencyDeadline: 22,
weatherRisk: 20,
cropReadiness: 18,
queueWaiting: 10,
distanceLogistics: 8,
resourceConstraints: 5
}
}

The system must generate a human-readable explanation, for example:

"Farmer A received higher priority because the harvesting deadline is near, weather risk is high, and the crop is at peak harvest readiness."

TIME CONFLICT RULE

Two schedules conflict when:

newStartTime < existingEndTime

AND

newEndTime > existingStartTime

The system must mathematically prevent double booking.

FEASIBLE SLOT GENERATION

The scheduling engine must find feasible time slots within:

earliestStart

and:

latestEnd

The engine must consider:

* Required duration.
* Existing schedules.
* Resource operating window.
* Resource maintenance status.
* Travel time.
* Buffer time.
* Resource location.
* Farm location.

A slot is feasible only if the resource can arrive, operate for the required duration, and still satisfy all constraints.

TRAVEL AND LOGISTICS

For the MVP, external maps are not required.

Use synthetic farm/resource coordinates.

Travel time may be estimated using a simple deterministic method.

Example approach:

1. Calculate approximate distance between two coordinates.
2. Convert distance into estimated travel minutes.
3. Add travel and buffer time.
4. Check whether the next booking is feasible.

The scheduling engine must clearly expose the travel/buffer calculation.

DYNAMIC DISRUPTION HANDLING

The system must support simulated disruptions:

* Mechanical breakdown.
* Weather alert.
* Delay.
* Cancellation.

When a disruption occurs:

1. Identify affected schedules.
2. Mark affected schedules as disrupted.
3. Identify affected requests.
4. Recalculate feasibility.
5. Recalculate priority where necessary.
6. Search for an alternative resource.
7. Search for an alternative feasible time slot.
8. Generate a revised schedule.
9. Update the Master dashboard.
10. Show an explanation of the reallocation.

Example:

"Tractor A became unavailable from 10:00 to 15:00 because of a simulated mechanical breakdown. Farmer B was moved to Tractor B because it was the nearest operational compatible resource. Farmer C was moved to the next feasible slot."

OFFLINE-FIRST REQUIREMENT

A full production PWA is not required for the MVP.

Implement simulated offline-first behavior using:

* navigator.onLine
* localStorage

When offline:

1. Farmer submits a request.
2. Request is stored locally.
3. Display "Saved Offline" or "Pending Sync".
4. When internet returns, automatically send queued requests to the backend.
5. Update local status to "Synced".

MASTER DASHBOARD

The Master dashboard must display:

* Resources.
* Pending requests.
* Allocated requests.
* Conflicts.
* Priority scores.
* Priority breakdown.
* Feasible slots.
* Current schedules.
* Travel/buffer information.
* Active disruptions.
* Reallocation results.
* Human-readable decision explanations.

API CONTRACT

AUTHENTICATION

POST /api/auth/register

POST /api/auth/login

FARMS

POST /api/farms

GET /api/farms/my

PATCH /api/farms/:id

RESOURCES

GET /api/resources

POST /api/resources

GET /api/resources/my

PATCH /api/resources/:id

DELETE /api/resources/:id

FARMER REQUESTS

POST /api/requests

GET /api/requests/my

GET /api/requests/:id

PATCH /api/requests/:id/cancel

SCHEDULING

GET /api/schedule/resource/:resourceId

POST /api/schedule/generate

MASTER

GET /api/master/dashboard

GET /api/master/requests

GET /api/master/conflicts

POST /api/master/allocate

DISRUPTIONS

POST /api/disruptions

POST /api/disruptions/:id/reallocate

GET /api/disruptions

AUTHENTICATION

Use JWT.

Protected requests must send:

Authorization: Bearer JWT_TOKEN

Role-based authorization must prevent:

* FARMER accessing Master APIs.
* FARMER accessing Resource Owner APIs.
* RESOURCE_OWNER accessing Master-only APIs.
* Unauthorized users modifying other users' data.

IMPORTANT FINAL INSTRUCTION

Before writing code:

1. Read the existing repository.
2. Read /docs/FARMGRID_RULES.md if it exists.
3. Follow this database schema exactly.
4. Follow this API contract exactly.
5. Do not generate a separate project.
6. Do not modify unrelated modules.
7. Integrate with the existing application.
8. Test before committing.

The final application must demonstrate agricultural resource coordination under scarcity, not a simple rental marketplace.
