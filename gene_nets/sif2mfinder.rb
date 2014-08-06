#!/usr/bin/ruby
# encoding: utf-8
#
#  untitled.rb
#
#  Created by Dan MacLean (TSL) on 2014-02-14.
#  Copyright (c). All rights reserved.
#


nodes = {}
max = 1

require 'pp'

f = File.open(ARGV[0], "r")

f.each do |line|
  line.gsub!(/"/, "")
  line = line.chomp
    a = line.split(/\s/)
  if not nodes.has_key?(a[0])
    nodes[a[0]] = max
    max = max + 1
  end
  if not nodes.has_key?(a[1])
    nodes[a[1]] = max
    max = max + 1
  end
end
f.close



f = File.open(ARGV[0], "r")

f.each do |line|
    line.gsub!(/"/, "")
  line = line.chomp
  a = line.split(/\s/)
  puts [nodes[a[0]], nodes[a[1]], 1 ].join(" ")
end
f.close

