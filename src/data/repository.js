import { isRemoteBackend } from "../config.js";
import { localRepository } from "./localRepository.js";
import { sharePointRepository } from "./sharePointRepository.js";

// Single data access point for the app. Both backends expose the same async
// per-record CRUD surface so the UI never branches on storage type.
export const repository = isRemoteBackend ? sharePointRepository : localRepository;
