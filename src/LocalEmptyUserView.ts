import { LocalUserView } from "@/local_user_view";

export default class LocalEmptyUserView extends LocalUserView<null, null, null> {
    createLocalUserView() {
        return null;
    }
    createLocalRow() {
        return null;
    }
    createLocalValue() {
        return null;
    }
    createAddedLocalValue() {
        return null;
    }
    createEmptyLocalRow() {
        return null;
    }
    createAddedLocalRow() {
        return null;
    }
    createEmptyLocalValue() {
        return null;
    }
}
