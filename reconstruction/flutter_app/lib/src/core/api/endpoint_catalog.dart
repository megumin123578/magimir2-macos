/// Route strings observed in the shipped Flutter AOT binary.
///
/// These constants are evidence references, not an enabled API client. HTTP
/// methods, payloads, authentication, and runtime reachability remain unknown.
abstract final class EndpointCatalog {
  static const basePath = '/hms/selectPhoto/appApi';

  static const userInfo = '$basePath/photo/user/info';
  static const logout = '$basePath/retouch/user/logout';
  static const storeList = '$basePath/auth/register/login/storeList';
  static const qiniuUploadBucket =
      '$basePath/photo/qiniu/fetchQiniuUploadBucket';

  static const presetList = '$basePath/aiPro/preset/mark/list';
  static const presetAdd = '$basePath/aiPro/preset/mark/add';
  static const presetDelete = '$basePath/aiPro/preset/mark/delete2';

  static const currentSeat = '$basePath/seat/currentUserSeat';
  static const seatList = '$basePath/seat/list';
  static const seatStatistics = '$basePath/seat/stat';

  static const subscriptionPlans = '$basePath/subscription/available/list';
  static const subscribe = '$basePath/subscription/subscribe';

  static const feedbackList = '$basePath/photo/issueFeedback/getMyFeedbacks';
  static const feedbackAdd = '$basePath/photo/issueFeedback/addIssue';
  static const feedbackUnread = '$basePath/photo/issueFeedback/getUnreadCount';
}
