import { boot } from 'quasar/wrappers';
import BytetradeUi, { BtNotify, BtDialog, BtCustomDialog } from '@bytetrade/ui';
// import VueLazyload from 'vue-lazyload';
import { Notify, Dialog } from 'quasar';

export default boot(async ({ app }) => {
	app.use(BytetradeUi);
	// app.use(VueLazyload);
	app.use(BtCustomDialog, {
		defaultOkClass: 'launcher-global-ok-button'
	});
	BtNotify.init(Notify);
	BtDialog.init(Dialog);
});
