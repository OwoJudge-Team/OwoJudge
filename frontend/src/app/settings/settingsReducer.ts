export interface SettingsState {
  username: string;
  studentId: string;
  displayName: string;
  role: string;
  sshPublicKey: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  message: { text: string; type: "success" | "error" } | null;
}

type Action =
  | { type: "SET_FIELD"; field: keyof SettingsState; value: string }
  | { type: "LOAD_USER"; payload: Partial<SettingsState> }
  | { type: "SET_LOADING"; value: boolean }
  | { type: "SET_MESSAGE"; value: { text: string; type: "success" | "error" } | null }
  | { type: "RESET_PASSWORD_FIELDS" };

export const initialState: SettingsState = {
  username: "",
  studentId: "",
  displayName: "",
  role: "user",
  sshPublicKey: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  loading: true,
  message: null,
};

export function settingsReducer(state: SettingsState, action: Action): SettingsState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "LOAD_USER":
      return { ...state, ...action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.value };
    case "SET_MESSAGE":
      return { ...state, message: action.value };
    case "RESET_PASSWORD_FIELDS":
      return {
        ...state,
        newPassword: "",
        confirmPassword: "",
        currentPassword: "",
      };
    default:
      return state;
  }
}
