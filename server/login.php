<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('entry_lib.php');
require_once('message_lib.php');

async_start();

if (!isset($_POST['username']) || !isset($_POST['password'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$username = $conn->real_escape_string($_POST['username']);
$password = $_POST['password'];

if (
  !empty($_POST['inner_entry_query']) &&
  !verify_entry_info_query($_POST['inner_entry_query'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$result = $conn->query(
  "SELECT id, hash, username, email, email_verified ".
    "FROM users WHERE username = '$username' OR email = '$username'"
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!password_verify($password, $user_row['hash'])) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$id = intval($user_row['id']);
create_user_cookie($id);

$current_as_of = round(microtime(true) * 1000); // in milliseconds
list($message_infos, $truncation_status, $users) =
  get_message_infos(null, DEFAULT_NUMBER_PER_THREAD);

$return = array(
  'success' => true,
  'current_user_info' => array(
    'id' => (string)$id,
    'username' => $user_row['username'],
    'email' => $user_row['email'],
    'email_verified' => (bool)$user_row['email_verified'],
  ),
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
  'server_time' => $current_as_of,
);

if (!empty($_POST['inner_entry_query'])) {
  $entry_result = get_entry_infos($_POST['inner_entry_query']);
  if ($entry_result !== null) {
    list($entries, $entry_users) = $entry_result;
    $return['entry_infos'] = $entries;
    $users = array_merge($users, $entry_users);
  }
}

$return['user_infos'] = array_values($users);

async_end($return);
