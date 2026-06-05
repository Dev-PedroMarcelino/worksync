/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export let db: any = null;
export let auth: any = null;
export let isDemoMode = true;

// Check if dynamic configuration is available or if we are still on the mockup credentials
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "MOCK_API_KEY") {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true
    }, (firebaseConfig as any).firestoreDatabaseId);
    auth = getAuth(app);
    isDemoMode = false;
    console.log("Firebase initialized successfully with config from project:", firebaseConfig.projectId);
  } catch (error) {
    console.error("Failed to initialize Firebase real SDK. Fallback to Local/Demo mode active.", error);
    isDemoMode = true;
  }
} else {
  console.log("Firebase is configured in DEMO MODE. Direct cloud transactions will be emulated in localStorage.");
  isDemoMode = true;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || "DEMO_USER_ID",
      email: auth?.currentUser?.email || "demo@user.com",
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
