# Docker deployment reflection

Ujjain Sri Ganesh — 226411987

This is a submission of the completed LibSwap application into my individual repository with the intention of maintaining the Git history and remote. It features the catalogue, the login screen, the borrow/return page, Express APIs, and MongoDB-powered reservations. The application stack was not replaced by the existing Docker configuration from the source project, but rather it was retained and verified.

Uses node 22, installs production dependencies using the lockfile. It helps to eliminate unnecessary privileges by running as a non-root user. Compose is responsible for managing the app and MongoDB, and connects to the database via the service name `mongo`. Express serves the frontend and API from a single origin, therefore relative requests on browser are supported without the need to configure frontend. A named volume maintains accounts, loans and reservations as containers are recreated and health checks ensure database readiness.

A real problem was that another local stack already used port 3000. So the individual verification stack had to be configured to run on port 3001 and its own Compose project and database volume. This enabled testing to be done without impacting the current application. The student endpoint also required the full name, not the string of the compact name. The README was modified to correct the individual repository and to remove the reference to missing evidence files.

The runtime secrets are created locally on the machine and stored in a file that is ignored. Those files, dependencies installed on the host and Git metadata are not included in the Docker build. Local MongoDB eliminates the need for the marker to have Atlas credentials.

A difficult aspect of the verification was to ensure that successful requests were indicative of ongoing application behaviour. Registered and logged in users could be tested, concurrent borrowing and duplicate reservations were tested, return ownership and queue priority were tested. A test was run that left a loan and reservoir in the database, recreated the containers and ran the borrowing and return on reservoir to a successful completion.

The best outcome was seeing the full app up and running on localhost after recreating the containers, and the workflow with the database still running. This was shown to be repeatable beyond the starting of an Express process.