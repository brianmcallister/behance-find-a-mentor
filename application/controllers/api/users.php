<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Users extends MY_Controller {

  public function index() {

    $this->load->database();

    $query = $this->db->query('SELECT * FROM users');

    return $this->_json_output( array(
      'valid' => 1,
      'users' => $query->result_array()
    ) );

  } // index

} // Users
