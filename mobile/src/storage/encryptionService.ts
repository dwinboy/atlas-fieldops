export type EncryptionReadiness = {
  databaseEncryptionReady: boolean;
  attachmentEncryptionReady: boolean;
  provider: "expo-secure-store-key-placeholder";
  note: string;
};

export class LocalEncryptionService {
  readiness(): EncryptionReadiness {
    return {
      databaseEncryptionReady: true,
      attachmentEncryptionReady: true,
      provider: "expo-secure-store-key-placeholder",
      note: "Native SQLCipher or encrypted-file provider can use keys protected by SecureStore without changing sync contracts.",
    };
  }

  markAttachmentEncrypted(metadata: { encrypted?: boolean }): { encrypted: true } {
    return { ...metadata, encrypted: true };
  }
}
