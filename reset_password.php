<?php

require_once('config.php');
require_once('auth.php');
require_once('verify.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

if (user_logged_in()) {
  exit(json_encode(array(
    'error' => 'already_logged_in',
  )));
}

if (!isset($_POST['password']) || !isset($_POST['code'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$password = $_POST['password'];
if (trim($password) === '') {
  exit(json_encode(array(
    'error' => 'empty_password',
  )));
}

$code = $_POST['code'];
$verification_result = verify_code($code);
if (!$verification_result) {
  exit(json_encode(array(
    'error' => 'invalid_code',
  )));
}

list($user, $field) = $verification_result;
if ($field !== VERIFY_FIELD_RESET_PASSWORD) {
  exit(json_encode(array(
    'error' => 'invalid_code',
  )));
}

$salt = md5(openssl_random_pseudo_bytes(32));
$hash = hash('sha512', $password.$salt);
$conn->query(
  "UPDATE users SET salt = UNHEX('$salt'), hash = UNHEX('$hash') ".
    "WHERE id = $user"
);

create_user_cookie($user);

clear_verify_codes($user, VERIFY_FIELD_RESET_PASSWORD);

exit(json_encode(array(
  'success' => true,
)));