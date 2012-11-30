<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Fields extends MY_Controller {

  public function index() {

    $this->load->database();

    $query = $this->db->query('SELECT * FROM fields');

    return $this->_json_output( array(
      'valid'  => 1,
      'fields' => $query->result_array()
    ) );

  } // index

} // Fields
