import Vue from "vue";

export default class MobileMixin extends Vue {
    get isMobile(): boolean {
        const mobileCheck = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        return mobileCheck;
    }
}
